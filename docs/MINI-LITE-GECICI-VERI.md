# Mini Lite — geçici veri modu (ephemeral)

Mini Lite kayıt tutmayan, tek kişilik plandır. Müşteri kaydı ve randevu geçmişi **kalıcı tutulmaz**:
randevu tamamlanınca / iptal edilince satır **hard delete** edilir; durumu ne olursa olsun bitişinden
24 saat sonra da silinir. Diğer planlar (trial, mini, starter, pro, business) `persistent` kalır.

## Plan tablosu

| | Mini Lite | Mini | Starter | Pro | Business |
|---|---|---|---|---|---|
| Aylık TL | ₺499 | ₺699 | ₺1.199 | ₺1.699 | ₺4.699 |
| Yıllık TL | ₺4.900 | ₺6.900 | ₺11.798 | ₺16.718 | ₺46.238 |
| USD aylık / yıllık | 18 / 177 | 25 / 246 | 29 / 285 | 39 / 384 | 99 / 974 |
| EUR aylık / yıllık | 16 / 157 | 23 / 226 | 26 / 256 | 33 / 325 | 84 / 827 |
| Personel | 1 | 1 | 8 | sınırsız | sınırsız |
| Randevu/ay | 150 | 200 | sınırsız | sınırsız | sınırsız |
| WA/ay | 300 | 400 | 500 | 1.500 | 3.000 |
| Veri | silinir | kalıcı | kalıcı | kalıcı | kalıcı |

Tek kaynak: `src/lib/pricing.ts` (fiyat), `src/lib/entitlements.ts` (limitler/WA kotası),
`src/lib/stripe/config.ts` (plan → Stripe Price env).

## Canlıya alma sırası

1. **Migration** (Supabase SQL Editor): `supabase/migrations/20261018_mini_lite_ephemeral.sql`
   (idempotent). Geri alma: `supabase/migrations/rollback/20261018_mini_lite_ephemeral_down.sql`.
   Kod migration'dan önce de deploy edilebilir (silme günlük cron'da `skipped` döner).
2. **Stripe** — yeni Price'lar (`currency_options` tutarları `lib/pricing.ts` ile BİREBİR):
   - Mini Lite: ₺499 / ₺4.900 · $18 / $177 · €16 / €157
   - Mini (yeni fiyat): ₺699 / ₺6.900 · $25 / $246 · €23 / €226
3. **Vercel env**: `STRIPE_PRICE_LITE_MONTHLY`, `STRIPE_PRICE_LITE_ANNUAL`, `STRIPE_PRICE_MINI_MONTHLY`,
   `STRIPE_PRICE_MINI_ANNUAL` (yeni Mini Price'ları). Mevcut Mini aboneleri eski fiyatta kalacaksa
   eski Price ID'lerini `STRIPE_PRICE_MINI_LEGACY_MONTHLY` / `STRIPE_PRICE_MINI_LEGACY_ANNUAL` olarak ekleyin
   (webhook onları Mini olarak tanır). Env yokken Lite checkout "fiyat tanımlı değil" döner.
4. `vercel.json` → `/api/cron/purge-ephemeral` (günlük 02:30 UTC) yedek silme turu. Supabase'de `pg_cron`
   varsa migration saatlik iş de kurar.

## Davranış

- **Silme:** `lib/data-retention.ts` → `hardDeleteIfEphemeral` (tamamlandı/iptal, müşteri bildirimi
  tetiklendikten SONRA) + DB `purge_ephemeral_appointments()` (24 saat kuralı, idempotent, yalnızca
  ephemeral planlar; gelecek randevulara dokunmaz → hatırlatma çalışır).
- **Müşteri kaydı yok:** randevu oluşturmada `customers` / `customer_consents` yazılmaz; DB
  tetikleyicisi (`skip_pii_insert_for_ephemeral`) güvenlik ağıdır. "Tamamlandı" durumuna çekilmeden silinir
  (aksi halde DB tetikleyicisi gelir satırına müşteri adı yazardı). Denetim kaydına (audit_logs) müşteri adı yazılmaz.
- **Aylık randevu hakkı:** satırlar silindiği için `plan_usage` sayacı (`kind = 'appointment'`) kullanılır.
- **403:** müşteriler, export, import, rapor/gelir, geçmiş, paket, gelir-gider, stok, personel primi, arama,
  bekleme listesi API'leri; müşteriler/paketler/raporlar sayfaları yönlendirir. Menü de gizlenir.
- **Geçişler:** Pro/Mini/Trial → Lite: açık onay (UI kutusu + sunucuda `acknowledge_data_loss`), 30 günlük
  dışa aktarma süresi (`organizations.data_retention_until`; yalnızca okuma/export serbest), süre dolunca
  `purge_expired_retention_history()` eski müşteri + geçmişi siler. Lite → üst plan: süre temizlenir, kayıt
  tutma o andan başlar, bilgilendirme metni gösterilir.

## Test

Yerel testler (sahte DB / pglite) deponun dışında yazıldı; çalıştırılan kapsam: 60 SQL + 97 rota/geçiş testi
(persistent regresyonları dahil). Gerçek Supabase / Stripe / Meta ile uçtan uca denenmedi.
