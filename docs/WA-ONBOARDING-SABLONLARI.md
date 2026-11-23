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
