-- ============================================================
-- Kampanya indirim hakkı — iade (geri verme) tetikleyicileri
-- ============================================================
-- ÖNKOŞUL: 20260930_campaign_offers.sql çalıştırılmış olmalı.
--
-- Amaç: İndirimle tamamlanan randevu HERHANGİ bir yoldan (panel, takvim,
-- API, toplu işlem, elle SQL) tamamlandı durumundan çıkarsa ya da silinirse
-- müşterinin hakkı kaybolmasın:
--   1) Tamamlandı → iptal / gelmedi / onaylandı / talep ...:
--        * campaign_logs.redeemed_* temizlenir (hak geri açılır)
--        * randevu fiyatı indirimsiz tutara geri yazılır, discount_amount = 0,
--          campaign_log_id = NULL (tekrar tamamlanırsa hak yeniden sorulur)
--      Müşteri istatistiklerini ve otomatik gelir satırını düzelten mevcut
--      tetikleyici (on_appointment_status_change) OLD.price kullandığı için
--      etkilenmez: indirimli tutar cirodan doğru şekilde düşer.
--   2) Randevu satırı silinirse hak yine geri açılır.
--
-- Hak, randevu GÜNÜ son gün içindeyse iade sonrası da geçerlidir (uygulama
-- tarafındaki kontrol randevu tarihine bakar).
--
-- Geriye uyumluluk: campaign_log_id boş olan (yani indirimsiz) hiçbir randevu
-- bu tetikleyicilerden etkilenmez; WHEN koşulu satırı hiç çalıştırmaz.
-- Tekrar çalıştırılması güvenlidir.
-- ============================================================

CREATE OR REPLACE FUNCTION release_campaign_offer_on_uncomplete()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Hakkı geri aç (yalnızca bu randevunun kullandığı hak)
  UPDATE campaign_logs
     SET redeemed_at = NULL,
         redeemed_appointment_id = NULL
   WHERE id = OLD.campaign_log_id
     AND redeemed_appointment_id = OLD.id;

  -- Fiyatı indirimsiz haline döndür. Aynı işlemde fiyat elle değiştirildiyse
  -- (örn. hizmet değişimi fiyatı kataloğa çeker) üzerine yazma.
  IF NEW.price IS NOT DISTINCT FROM OLD.price THEN
    NEW.price := COALESCE(NEW.price, 0) + COALESCE(OLD.discount_amount, 0);
  END IF;
  NEW.discount_amount := 0;
  NEW.campaign_log_id := NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_release_campaign_offer_uncomplete ON appointments;
CREATE TRIGGER trg_release_campaign_offer_uncomplete
  BEFORE UPDATE OF status ON appointments
  FOR EACH ROW
  WHEN (
    OLD.campaign_log_id IS NOT NULL
    AND OLD.status = 'tamamlandi'
    AND NEW.status IS DISTINCT FROM 'tamamlandi'
  )
  EXECUTE FUNCTION release_campaign_offer_on_uncomplete();

CREATE OR REPLACE FUNCTION release_campaign_offer_on_delete()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE campaign_logs
     SET redeemed_at = NULL,
         redeemed_appointment_id = NULL
   WHERE id = OLD.campaign_log_id
     AND redeemed_appointment_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_release_campaign_offer_delete ON appointments;
CREATE TRIGGER trg_release_campaign_offer_delete
  BEFORE DELETE ON appointments
  FOR EACH ROW
  WHEN (OLD.campaign_log_id IS NOT NULL)
  EXECUTE FUNCTION release_campaign_offer_on_delete();
