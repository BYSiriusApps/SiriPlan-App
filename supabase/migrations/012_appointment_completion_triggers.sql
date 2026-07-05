-- ============================================================
-- 012 — Idempotent patch for 010/011 + otomatik gelir/müşteri güncelleme
-- Supabase SQL Editor'da güvenle çalıştırılabilir (tüm adımlar idempotent)
-- ============================================================

-- ─── 010 PATCH: policy zaten varsa drop et, yeniden oluştur ──
DROP POLICY IF EXISTS "org_members_manage_requests" ON appointment_requests;
CREATE POLICY "org_members_manage_requests" ON appointment_requests
  FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()))
  WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

-- ─── 011 PATCH: policy zaten varsa drop et, yeniden oluştur ──
DROP POLICY IF EXISTS "invites_manage" ON staff_invitations;
CREATE POLICY "invites_manage" ON staff_invitations
  FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()))
  WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

-- Anon token okuma (davet kabul akışı için)
DROP POLICY IF EXISTS "invites_public_token_read" ON staff_invitations;
CREATE POLICY "invites_public_token_read" ON staff_invitations
  FOR SELECT TO anon
  USING (status = 'pending' AND expires_at > NOW());

-- İndeksler (IF NOT EXISTS — güvenle tekrar çalıştırılabilir)
CREATE INDEX IF NOT EXISTS idx_staff_invitations_token ON staff_invitations(token);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_org   ON staff_invitations(org_id, status);

-- ─── KOTA TRIGGER (011'den eksik kalan) ──────────────────────
CREATE OR REPLACE FUNCTION check_appointment_quota()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_max   INT;
  v_count INT;
  v_month_start TIMESTAMPTZ;
  v_month_end   TIMESTAMPTZ;
BEGIN
  SELECT max_appointments_monthly INTO v_max FROM organizations WHERE id = NEW.org_id;
  IF v_max IS NULL OR v_max >= 999999 THEN RETURN NEW; END IF;

  v_month_start := date_trunc('month', NOW());
  v_month_end   := v_month_start + INTERVAL '1 month';

  SELECT COUNT(*) INTO v_count
    FROM appointments
   WHERE org_id = NEW.org_id
     AND created_at >= v_month_start
     AND created_at <  v_month_end;

  IF v_count >= v_max THEN
    RAISE EXCEPTION 'Aylık randevu limitine ulaşıldı (%). Plan yükseltmeniz gerekiyor.', v_max;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_appointment_quota ON appointments;
CREATE TRIGGER trg_appointment_quota
  BEFORE INSERT ON appointments
  FOR EACH ROW EXECUTE FUNCTION check_appointment_quota();

CREATE INDEX IF NOT EXISTS idx_appointments_reminder
  ON appointments(appointment_at, status, reminder_sent_at, reminder2_sent_at)
  WHERE status = 'onaylandi';

-- ─── OTOMATİK GELİR + MÜŞTERİ GÜNCELLEME ────────────────────
-- Randevu "tamamlandi" durumuna geçince:
--   1. expenses tablosuna otomatik "gelir/randevu" kaydı eklenir
--   2. customers tablosunda total_spend, visit_count, last_visit_at güncellenir
-- Geri alınırsa (tamamlandi → başka durum): müşteri istatistikleri düzeltilir.

CREATE OR REPLACE FUNCTION on_appointment_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_service_name TEXT;
BEGIN
  -- ── Tamamlandı olarak işaretlendi ────────────────────────
  IF NEW.status = 'tamamlandi' AND OLD.status IS DISTINCT FROM 'tamamlandi' THEN

    -- Hizmet adını al
    SELECT name INTO v_service_name FROM services WHERE id = NEW.service_id;

    -- 1. Otomatik gelir kaydı (price > 0 ise)
    IF COALESCE(NEW.price, 0) > 0 THEN
      INSERT INTO expenses (
        org_id, type, category, amount, description, date, note
      ) VALUES (
        NEW.org_id,
        'gelir',
        'randevu',
        NEW.price,
        COALESCE(v_service_name, 'Randevu') || ' — ' || NEW.customer_name,
        NEW.appointment_at::DATE,
        'Otomatik — Randevu #' || LEFT(NEW.id::TEXT, 8)
      );
    END IF;

    -- 2. Müşteri istatistikleri güncelle
    IF NEW.customer_id IS NOT NULL THEN
      UPDATE customers SET
        total_spend  = COALESCE(total_spend, 0) + COALESCE(NEW.price, 0),
        visit_count  = COALESCE(visit_count, 0) + 1,
        last_visit_at = GREATEST(
          COALESCE(last_visit_at, '1970-01-01'::TIMESTAMPTZ),
          NEW.appointment_at
        ),
        -- Sadakat puanı: her tamamlanan randevu +1 damga
        loyalty_punches = LEAST(10, COALESCE(loyalty_punches, 0) + 1),
        -- Müşteri skoru: +5 puan, max 100
        score = LEAST(100, COALESCE(score, 0) + 5),
        updated_at = NOW()
      WHERE id = NEW.customer_id AND org_id = NEW.org_id;
    END IF;

  -- ── Tamamlandı'dan geri alındı ───────────────────────────
  ELSIF OLD.status = 'tamamlandi' AND NEW.status IS DISTINCT FROM 'tamamlandi' THEN

    -- Müşteri istatistiklerini geri al
    IF NEW.customer_id IS NOT NULL THEN
      UPDATE customers SET
        total_spend   = GREATEST(0, COALESCE(total_spend, 0) - COALESCE(OLD.price, 0)),
        visit_count   = GREATEST(0, COALESCE(visit_count, 0) - 1),
        loyalty_punches = GREATEST(0, COALESCE(loyalty_punches, 0) - 1),
        score         = GREATEST(0, COALESCE(score, 0) - 5),
        updated_at    = NOW()
      WHERE id = NEW.customer_id AND org_id = NEW.org_id;
      -- last_visit_at güncellenmiyor: önceki değeri geri almak karmaşık
    END IF;

    -- NOT: Gelir kaydı otomatik geri alınmıyor (gerçek işlem gerçekleşmişti).
    -- Kullanıcı manuel silmek isterse Gelir/Gider sayfasından yapabilir.

  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_appointment_completion ON appointments;
CREATE TRIGGER trg_appointment_completion
  AFTER UPDATE OF status ON appointments
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION on_appointment_status_change();

-- ─── appointments tablosunda gereksiz duplicate policy kontrolü ──
-- (002+ migration'larda public_appointments_insert zaten hardened)
-- Ekstra güvence: authenticated kullanıcılar kendi org'larındaki
-- appointments'ı SELECT edebilmeli (get_my_org_id() ile zaten var,
-- bu sadece temel policy'nin doğruluğunu garantilemek için)
-- Hiçbir şey silinmiyor, sadece OR mantığıyla çalışıyor.
