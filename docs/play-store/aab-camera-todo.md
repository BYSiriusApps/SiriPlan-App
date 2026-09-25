# ⏳ AAB güncellemesi gerekli — Barkod tarama kamerası (uygulama içi)

**Tarih:** 11 Eylül 2026
**Öncelik:** Orta (özellik elle girişle şu an tam çalışıyor; kamera sadece
mobil tarayıcıda aktif).

## Durum

`/dashboard/stok` → **"Barkodla Sat"** özelliği canlı. Kamerayla barkod tarama:

| Ortam | Kamera taraması | Elle giriş |
|---|---|---|
| Masaüstü Chrome/Edge | ✅ (BarcodeDetector) | ✅ |
| Masaüstü/iOS Safari, Firefox | ✅ (@zxing/browser fallback) | ✅ |
| Android mobil Chrome | ✅ | ✅ |
| **Kurulu Play Store uygulaması (TWA)** | ❌ CAMERA izni yok | ✅ |

TWA WebView'ı `getUserMedia`'yı reddediyor çünkü kurulu AAB `android.permission.CAMERA`
bildirmiyor. `BarcodeScanner` bileşeni bu durumda otomatik **elle barkod girişi**
moduna düşüyor — satış tam çalışıyor, sadece kamera kısayolu yok.

Web tarafında gereken izin zaten verildi: `next.config.ts` →
`PERMISSIONS_POLICY_DASHBOARD` = `camera=(self)` (deploy ile canlı).

## Yapılacaklar (kamera uygulamada da çalışsın)

1. **TWA projesinde CAMERA iznini aç.**
   - PWABuilder ile üretildiyse: paketi yeniden oluştururken "Camera" iznini işaretle
     (twa-manifest.json → `"features"` / `"permissions"` → `android.permission.CAMERA`).
   - Bubblewrap ile: `twa-manifest.json`'a
     ```json
     "additionalTrustedOrigins": [],
     "features": {},
     "permissions": ["android.permission.CAMERA"]
     ```
     ya da `bubblewrap update` sonrası `app/src/main/AndroidManifest.xml` içine
     `<uses-permission android:name="android.permission.CAMERA" />` ekle.
2. **Yeni AAB üret** (`bubblewrap build` / PWABuilder indir). Sürüm kodunu artır.
   - ⚠️ `assetlinks.json` ve App Signing SHA-256 **değişmez** — sadece yeni sürüm.
3. **Play Console → Üretim → Yeni sürüm** → AAB'yi yükle → notlar: "Barkod tarama
   için kamera izni eklendi."
4. **Play Console → App content → Data safety** formunu güncelle:
   - Kamera/fotoğraf: "Uygulama işlevi için kullanılır (barkod tarama)."
   - "Veri toplanmıyor / paylaşılmıyor" — görüntü cihazdan çıkmıyor.
5. **IARC anketi** değişmez (içerik aynı).
6. İnceleme sonrası: test cihazında uygulamayı güncelle/yeniden kur →
   `/dashboard/stok` → "Barkodla Sat" → Android kamera izni penceresi çıkmalı →
   tarama çalışmalı.

## Etkilenmeyenler

- `assetlinks.json`, App Signing anahtarı, paket adı (`com.siriplan.app`).
- Web deploy — kamera web'de zaten çalışıyor.
- Mevcut mağaza sürümü — elle girişle özellik tam kullanılabilir, acil değil.
