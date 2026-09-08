# Play Store — Sonraki Güncelleme Başvurusu Notları

> **Önce şunu bil:** Android uygulaması bir **TWA** (Trusted Web Activity) —
> yani `siriplan.com`'daki canlı web panelini gösteren ince bir kabuk.
> Aşağıdaki değişikliklerin **hiçbiri** APK/AAB içeriğine dokunmaz; web'e
> deploy edildiği an mağazadaki uygulamada da görünür. Yeni bir AAB yüklemek
> **gerekmez.**
>
> Yeni AAB yalnızca şu durumlarda gerekir: `assetlinks.json` / imza anahtarı,
> `AndroidManifest`, `build.gradle` (`versionCode`/`versionName`), uygulama
> ikonu / splash, izin listesi veya `targetSdk` değişirse. Bu turda bunların
> hiçbiri değişmedi.

Eğer yine de `versionCode` artırıp yeni bir sürüm yayınlarsanız, Play Console
"Sürüm notları" ve (istenirse) inceleme notu için hazır metin:

---

## Sürüm notları (kullanıcıya görünür — tr-TR)

```
• Takvimde "Personel" görünümü artık aynı anda en fazla 2 personel gösteriyor;
  sütunlar genişledi, randevu bilgileri tam okunuyor. Daha fazla personel için
  sağ/sol oklarıyla sayfalayabilirsiniz.
• Her personelin rengi artık takvim sütununun tamamına işleniyor — kimin
  sütununa baktığınız bir bakışta belli.
• Randevuya dokununca açılan detay kutusu telefon ekranına tam sığıyor;
  alttaki "Tamamlandı / Gelmedi / İptal" düğmeleri artık kesilmiyor.
• Sayfa başlıkları sadeleştirildi, "Ana Sayfa" kısayolu sağ üst köşeye alındı.
• Sesli randevuda müşterinin adını söylediğinizde, kayıtlı bir müşteriyse
  telefon numarası forma otomatik dolduruluyor.
```

## Sürüm notları (en-US)

```
• Calendar "Staff" view now shows at most 2 staff at once with wider columns,
  so appointment details are fully readable. Use the arrows to page through
  more staff.
• Each staff member's colour now tints their whole calendar column.
• The appointment detail popover fits the phone screen — the status buttons
  at the bottom are no longer cut off.
• Page headers were simplified and the "Home" shortcut moved to the top-right.
• In voice booking, saying a customer's name now auto-fills their phone number
  if they are already on file.
```

## İnceleme notu (gerekirse — İngilizce)

```
This update contains UI-only changes to the web content rendered inside the
TWA (calendar layout, a popover that now fits small screens, header layout,
and a client-side convenience that pre-fills a saved customer's phone number
during voice booking). No changes to permissions, native code, billing
surfaces, data collection, or the digital asset links. All payment/subscription
management remains outside the app, on the web, as in previous submissions.
```

---

## Değişen dosyalar (geliştirici referansı)

| Alan | Dosya |
| --- | --- |
| Ana Sayfa ikonu (köşe + büyütme) | `src/components/dashboard/HomeButton.tsx` |
| Başlık düzeni (müşteriler/randevular/takvim) | `src/app/dashboard/musteriler/page.tsx`, `src/components/dashboard/RandevularHeader.tsx`, `src/components/dashboard/TakvimHeader.tsx` |
| Personel görünümü: 2'li sayfalama + sütun renk zemini | `src/components/dashboard/UnifiedCalendar.tsx` |
| Randevu detay popover'ının ekrana sığması | `src/components/dashboard/UnifiedCalendar.tsx` |
| Sesli randevuda ada göre telefon otomatik doldurma | `src/lib/voice-customer-lookup.ts`, `src/components/dashboard/QuickBookSheet.tsx`, `src/app/dashboard/randevular/yeni/page.tsx` |
