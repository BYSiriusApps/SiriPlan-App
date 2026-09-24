# SiriPlan Reels — Remotion projesi

Ana `randevu-sistemi` projesinden bağımsız (kendi `package.json`'ı ile) Remotion projesi. 6 Reels senaryosunu (`docs/sosyal-medya/2026-09-reels-senaryolari.md`) kod üzerinden, otomatik metin overlay + hook + logo/CTA outro ile birleştirir. Senaryo verisi: [src/data/reels.ts](src/data/reels.ts).

## Kurulum

```console
npm i
```

## Nasıl çalışır

1. **Footage'ı çek.** Her reel için `public/videos/<reel-id>/` klasöründe bir `README.md` var — tam olarak hangi dosya adını, kaç saniye ve ne çekeceğini listeliyor (ekran kaydı + isteğe bağlı yüz kamerası). Dikey 9:16, 30fps önerilir.
2. **Dosyaları bırak.** İlgili klasöre tabloda yazan dosya adıyla (`1-defter.mp4` gibi) videoyu koy. Dosya yoksa Remotion o sahnede "çekilecek görüntü" placeholder'ı gösterir — henüz çekim yapmadan metin/zamanlama akışını önizleyebilirsin.
3. **Önizle.**
   ```console
   npm run dev
   ```
   Sol taraftan 6 composition'dan birini seç (`reel-3-randevuyu-konusarak-olustur` = ilk paylaşılacak reels).
4. **Render al.**
   ```console
   npx remotion render <composition-id> out/<composition-id>.mp4
   ```

## Panel B-roll'unu otomatik kaydet (opsiyonel)

"Panel ekran kaydı" gerektiren 9 sahne (takvim, raporlar, hatırlatma ayarları,
personel ciro, stok/kasa vb.) `scripts/record-panel.py` ile demo hesap
üzerinden **gerçek** ekran kaydı olarak otomatik üretilebilir — Playwright ile
panelde gezinir, sadece okuma/gezinme yapar (onaylama/kaydetme yok, gerçek
WhatsApp/SMS tetiklenmesin diye).

```console
py -m pip install playwright
py -m playwright install chromium
winget install --id Gyan.FFmpeg -e   # Playwright'in kendi ffmpeg'i mp4 encode edemiyor

npm run dev -- -p 3010               # port 3000 baskasi tarafindan kullanilabilir
set PANEL_URL=http://localhost:3010 && py scripts/record-panel.py
```

Fiziksel çekim gerektiren sahneler (defter, elde telefon, yüz kamerası) ve ses
gerektiren sesli-asistan sahnesi bu script'te YOK — onları sen çekeceksin.
İlk çalıştırmada Turbopack her rotayı ilk kez derlerken yavaş olabilir (bkz.
script içindeki yorum); script `PANEL_ONLY=<dosya-adi>` ile tek bir sahneyi
tekrar denemene izin verir.

## Outro (logo + CTA)

Her reel'in son sahnesi footage gerektirmez — `public/brand/logo-full.png` + CTA metni otomatik oluşturulur ([src/components/Outro.tsx](src/components/Outro.tsx)).

## Metin/caption stili

[src/components/Caption.tsx](src/components/Caption.tsx) — spring ile pop-in, koyu yarı-şeffaf pill, marka fontu (Plus Jakarta Sans, [src/fonts.ts](src/fonts.ts)). Hook sahnesi (`isHook`) daha büyük ve üstte; diğerleri alt üçte birde.

## Yeni senaryo eklemek / süreleri değiştirmek

Sadece [src/data/reels.ts](src/data/reels.ts)'i düzenle — composition'lar ve süreler (`durationInFrames`) oradan otomatik hesaplanır, `Root.tsx`'e dokunmana gerek yok.

## Diğer komutlar

```console
npx remotion upgrade   # Remotion'ı güncelle
npm run lint            # eslint + tsc
```

## Docs

https://www.remotion.dev/docs
