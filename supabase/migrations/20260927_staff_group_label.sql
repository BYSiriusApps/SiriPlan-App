-- Kalabalık personel listesi (ör. 20 kişi) için takvimde hızlı gruplama.
-- İşletme, personel sayfasında serbest metin bir "grup" etiketi girer
-- (ör. "Makyöz", "Grup 1"); takvimin personel görünümünde bu etiketlerle
-- eşleşen personel tek tıkla filtrelenir. Mevcut "role" (Unvan/Rol) alanıyla
-- karıştırılmasın diye ayrı bir kolon — unvan kişiye özel olabilir
-- ("Kıdemli Kuaför"), grup ise ekip/kategori anlamında birden fazla
-- kişiyi kapsar.
ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS group_label TEXT;
