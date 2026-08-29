# Yedekleme & Kurtarma Planı — SEC-07

**Sahip:** Özgün Üstüay
**Son güncelleme:** 2026-08-29

---

## 1. Hedefler (RPO / RTO)

| Senaryo | RPO (kabul edilebilir veri kaybı) | RTO (kabul edilebilir kesinti) |
| --- | --- | --- |
| Yanlışlıkla tablo/satır silme | ≤ 5 dakika (PITR) | ≤ 2 saat |
| Bölgesel Supabase kesintisi | ≤ 24 saat (günlük yedek) | ≤ 8 saat |
| Tam proje kaybı / hesap ele geçirme | ≤ 24 saat | ≤ 24 saat |
| Vercel dağıtım hatası | 0 (kod git'te) | ≤ 15 dakika (önceki dağıtıma dön) |

## 2. Neyi yedekliyoruz

| Varlık | Yöntem | Konum | Sıklık |
| --- | --- | --- | --- |
| Postgres (tüm veri) | Supabase otomatik günlük yedek | Supabase | Günlük |
| Postgres (nokta-zaman) | **Supabase PITR — ETKİNLEŞTİRİLECEK** | Supabase | Sürekli (WAL) |
| Postgres (repo-dışı kopya) | `pg_dump` haftalık export | Şifreli harici depo | Haftalık |
| Şema & migration | Git (`supabase/migrations/`) | GitHub | Her değişiklik |
| Depolama (salon foto/logo) | Supabase Storage | Supabase | Supabase replikasyonu |
| Uygulama kodu | Git | GitHub + yerel | Sürekli |
| Env / sırlar | Parola yöneticisi (şifreli kasa) | Offline | Değişimde |

## 3. Yapılacaklar (bu plan tam devreye girene kadar)

- [ ] Supabase → Database → Backups → **PITR planını etkinleştir** (Pro add-on).
- [ ] Haftalık `pg_dump` için script + şifreli hedef (örn. yerel + parolalı arşiv).
      Taslak: `scripts/security/db-backup.sh` (bu PR'da eklenmedi — ayrı iş).
- [ ] Env kasası yedeğinin ikinci bir güvenli konumda kopyası.

## 4. Kurtarma prosedürleri

### 4.1 Yanlış silme (PITR)
1. Supabase → Database → Backups → Point in Time.
2. Silme anından **hemen önceki** zaman damgasını seç.
3. Yeni bir projeye geri yükle, doğrula, sonra veriyi taşı **veya** onaylıysa
   canlıyı o ana döndür (tüm sonraki yazımlar kaybolur — dikkat).
4. `npm run security:all -- --base=https://siriplan.com` ile bütünlük doğrula.

### 4.2 Tam proje kaybı
1. Yeni Supabase projesi oluştur.
2. `supabase/migrations/` tümünü sırayla uygula (bkz. `docs`/migration notları).
3. En son günlük yedeği / `pg_dump` çıktısını restore et.
4. Vercel env'de yeni proje URL + anahtarlarını güncelle → yeniden dağıt.
5. Storage bucket'larını yeniden oluştur, dosyaları geri yükle.
6. DNS / webhook (Stripe, Meta) uçlarını doğrula.

### 4.3 Kötü dağıtım
Vercel → Deployments → son iyi sürüm → "Promote to Production".

## 5. Geri yükleme tatbikatı (üç ayda bir)

| Tarih | Yapan | Senaryo | RTO gerçekleşen | Bulgular |
| --- | --- | --- | --- | --- |
| _(ilk tatbikat planlanacak)_ | | PITR ile tek tablo geri yükleme | | |

Tatbikat adımı: boş bir Supabase projesine son yedeği geri yükle, satır
sayılarını ve birkaç kritik sorguyu karşılaştır, süreyi kaydet, bu tabloya işle.
