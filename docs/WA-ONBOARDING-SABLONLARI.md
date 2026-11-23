# WhatsApp onboarding şablonları (Meta'ya gönderilecek)

Hat: SiriPlan utility numarası (+44). Kategori: UTILITY gönderildi, Meta MARKETING olarak sınıflandırdı (kabul).
Dil: tr. Gövde parametreleri sırayla {{1}}, {{2}}…; kod: `src/lib/wa-templates/internal-registry.ts`
(hosgeldin / deneme_2gun / deneme_bitti), gönderici: `onboarding-send.ts`.
Tetikleyiciler: kayıt (`api/auth/quick-register`, `auth/callback`) ve `api/cron/trial-reminder`.

## siriplan_hosgeldin_v1  ({{1}} ad, {{2}} işletme)

```
Merhaba {{1}} 👋

SiriPlan'a hoş geldiniz! "{{2}}" için 14 günlük ücretsiz denemeniz başladı.

📲 Uygulamayı indirin: siriplan.com/indir
🎬 Tanıtım sunumu: siriplan.com/sunum.html
📘 Kullanım kılavuzu: siriplan.com/dashboard/rehber

Kurulumda takıldığınız ya da anlamadığınız bir yer olursa +90 535 503 26 34 numaralı WhatsApp hattından bize yazabilirsiniz, size yardımcı olalım.

SiriPlan Ekibi
```

## siriplan_deneme_2gun_v1  ({{1}} işletme, {{2}} bitiş tarihi)

```
Merhaba,

"{{1}}" için SiriPlan ücretsiz deneme süreniz 2 gün sonra ({{2}}) bitiyor ⏳

Kesintisiz devam etmek için size uygun planı seçmeniz yeterli. Verileriniz, müşterileriniz ve randevularınız silinmez.

💳 Plan seç: siriplan.com/auth/plan-sec
🎬 Özellikler: siriplan.com/sunum.html
📘 Kullanım kılavuzu: siriplan.com/dashboard/rehber

Plan seçerken yardım isterseniz +90 535 503 26 34 numaralı WhatsApp hattından bize yazabilirsiniz.

SiriPlan Ekibi
```

## siriplan_deneme_bitti_v1  ({{1}} işletme)

```
Merhaba,

"{{1}}" için ücretsiz deneme süreniz bugün sona erdi. Verileriniz güvende; planınızı seçtiğiniz anda kaldığınız yerden devam edersiniz.

💳 Plan seç: siriplan.com/auth/plan-sec

Yardım için +90 535 503 26 34 numaralı WhatsApp hattından bize yazabilirsiniz.

SiriPlan Ekibi
```

---

# WhatsApp mesaj kotası bildirimleri (işletme sahibine) — 23 Kas 2026

Hat: SiriPlan utility numarası (WABA `1295808672630869`). Kategori UTILITY, dil tr. Gövde parametreleri:
`{{1}}` işletme adı, `{{2}}` kullanılan, `{{3}}` limit. Kod: `internal-registry.ts`
(`wa_kota_uyari` / `wa_kota_doldu` / `wa_paket_bitti`), gönderici `plan-limit-notify.ts` (`notifyWaQuota`).
Davranış: organizasyon dili `tr` ise önce şablon denenir (24 saatlik pencereye takılmaz); onaysız/başarısız/başka dilde
eski yol (Telegram + serbest metin + push) aynen sürer. Meta'ya gönderildi: PENDING (ids 1825081528534479,
2342059369669004, 2458587518013441). Onaylanınca ek bir şey yapmak gerekmez (adlar kodda). Diğer diller sonra.

## siriplan_wa_kota_uyari_v1 (%80)

```
Merhaba,

"{{1}}" için bu dönemki WhatsApp mesaj hakkınızın %80'i kullanıldı ({{2}}/{{3}}).

Hak dolunca; yenilenme tarihine ya da ek mesaj paketi alana kadar müşterilerinize otomatik onay/hatırlatma mesajı gönderilmez. Randevularınız normal şekilde kaydedilmeye devam eder.

💳 Ek paket al / planı yükselt: siriplan.com/dashboard/abonelik

SiriPlan Ekibi
```

## siriplan_wa_kota_doldu_v1 (%100)

```
Merhaba,

"{{1}}" için bu dönemki WhatsApp mesaj hakkınız doldu ({{2}}/{{3}}).

Yenilenme tarihine ya da ek mesaj paketi alana kadar müşterilerinize otomatik onay/hatırlatma mesajı gönderilmeyecek. Randevu kaydı ve düzenleme normal şekilde devam eder.

💳 Ek paket al / planı yükselt: siriplan.com/dashboard/abonelik

SiriPlan Ekibi
```

## siriplan_wa_paket_bitti_v1 (ek paket bitti)

```
Merhaba,

"{{1}}" için satın aldığınız ek mesaj paketi tükendi ve bu dönemki plan hakkınız da doldu ({{2}}/{{3}}).

Yeni paket alana ya da hakkınız yenilenene kadar müşterilerinize otomatik onay/hatırlatma mesajı gönderilmeyecek; randevularınız normal şekilde devam eder.

💳 Yeni paket al: siriplan.com/dashboard/abonelik

SiriPlan Ekibi
```
