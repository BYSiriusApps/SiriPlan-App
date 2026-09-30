-- ============================================================
-- Tamamlandı'dan geri alınan randevunun otomatik gelir satırını sil
-- ============================================================
-- Sorun: 012'deki trg_appointment_completion, randevu "tamamlandi" olunca
-- expenses'e "Otomatik — Randevu #<id8>" gelir satırı ekliyordu ama randevu
-- tamamlandıdan çıkınca (iptal / gelmedi / onaylandı'ya dönüş) satırı bırakıyordu.
-- Sonuç: tamamlanmamış randevu gelir tablosunda görünmeye devam ediyordu.
-- Bu satır elle düzenlenemez/silinemez (api/expenses "Otomatik" koruması), yani
-- yanlış kalan kayıt kullanıcı tarafından da temizlenemiyordu.
--
-- Çözüm: 012'deki fonksiyon aynen korunur; yalnızca geri alma dalına, o
-- randevuya ait otomatik gelir satırını silen tek bir DELETE eklenir.
-- Tekrar çalıştırılması güvenlidir (CREATE OR REPLACE, idempotent).
-- Not: yalnızca "Otomatik — Randevu #…" notlu satır silinir; paket satışı,
-- ekstra gelir ve elle girilen kayıtlara dokunulmaz.

CREATE OR REPLACE FUNCTION on_appointment_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_service_name TEXT;
BEGIN
  -- ── Tamamlandı olarak işaretlendi ────────────────────────
  IF NEW.status = 'tamamlandi' AND OLD.status IS DISTINCT FROM 'tamamlandi' THEN

    SELECT name INTO v_service_name FROM services WHERE id = NEW.service_id;

    -- 1. Otomatik gelir kaydı (price > 0 ise). Paketten karşılanan randevu
    --    price = 0 ile kapandığı için satır oluşmaz; gelir paket satışında yazılmıştır.
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
        loyalty_punches = LEAST(10, COALESCE(loyalty_punches, 0) + 1),
        score = LEAST(100, COALESCE(score, 0) + 5),
        updated_at = NOW()
      WHERE id = NEW.customer_id AND org_id = NEW.org_id;
    END IF;

  -- ── Tamamlandı'dan geri alındı ───────────────────────────
  ELSIF OLD.status = 'tamamlandi' AND NEW.status IS DISTINCT FROM 'tamamlandi' THEN

    IF NEW.customer_id IS NOT NULL THEN
      UPDATE customers SET
        total_spend   = GREATEST(0, COALESCE(total_spend, 0) - COALESCE(OLD.price, 0)),
        visit_count   = GREATEST(0, COALESCE(visit_count, 0) - 1),
        loyalty_punches = GREATEST(0, COALESCE(loyalty_punches, 0) - 1),
        score         = GREATEST(0, COALESCE(score, 0) - 5),
        updated_at    = NOW()
      WHERE id = NEW.customer_id AND org_id = NEW.org_id;
    END IF;

    -- YENİ: tamamlanmamış randevu gelir tablosunda kalmamalı.
    DELETE FROM expenses
     WHERE org_id = OLD.org_id
       AND type = 'gelir'
       AND category = 'randevu'
       AND note = 'Otomatik — Randevu #' || LEFT(OLD.id::TEXT, 8);

  END IF;

  RETURN NEW;
END;
$$;
