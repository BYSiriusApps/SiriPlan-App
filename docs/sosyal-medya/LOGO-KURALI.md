# SiriPlan logo kuralı (reels, slayt, video, post, hikaye — HEPSİ)

Sosyal medya için üretilen her içerikte (Reels, video, carousel/slayt, feed post, hikaye) logo **sitedeki haliyle** kullanılır:

- **İşaret (ikon):** `public/icons/icon-mark.png` — lacivert zemin üzerinde altın "S" ve yıldız. Köşeleri yuvarlatılmış kare olarak (site Navbar'ında `rounded-lg`).
- **Yazı:** "Siri" + soluk "(us)" + **"Plan" site ana renginde** (`--primary`, oklch(0.52 0.16 345), gül/pembe). Bkz. `src/components/marketing/Navbar.tsx` satır 61-73.
- Kısa yazı kullanılacaksa "SiriPlan" — "Plan" vurgulu renkte.

## Kullanma

- `reels/public/brand/logo-full.png` (beyaz kare zeminli, "BY Sirius" sloganlı sürüm) sosyal medya içeriklerinde **kullanılmaz**. Eski reels/outro bileşenleri (`reels/src/components/Outro.tsx`, `reels/src/Promo.tsx`, `reels/src/Posts.tsx`) bu dosyayı kullanıyor; bir sonraki düzenlemede site logosuyla değiştirilecek.
- Yeni içerik hazırlarken önce bu dosyayı oku.

## Not

Kural 7 Ekim 2026'da kullanıcı tarafından konuldu: ilk Ekim paketinde (`docs/sosyal-medya/2026-10-instagram-paketi/`) yanlış logo (logo-full.png) kullanıldığı için beğenilmedi. O pakette henüz bir değişiklik yapılmadı; kullanıcı yeniden düzenleme istemedi.
