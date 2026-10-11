# Görev 2: Hizmet kataloğu adları — Almanca ve İspanyolca

Kaynak: `docs/i18n-catalog-de-es-source.json` (anahtar = Türkçe kanonik ad, değer = İngilizce karşılığı;
güzellik/kuaför/spa/klinik/dövme/piercing hizmet ve kategori adları).

Üretilecek tek dosya: `src/lib/services/catalog-i18n-de-es.ts`. Şu biçimde olmalı (mevcut dosyayı DEĞİŞTİR,
içeriği doldur; başka hiçbir dosyaya dokunma, git komutu çalıştırma):

```ts
export const CATALOG_DE_ES: Record<string, readonly [de: string, es: string]> = {
  "Kadın Kesim": ["Damenhaarschnitt", "Corte de pelo de mujer"],
  // ... kaynak JSON'daki HER anahtar için bir satır
};
```

Kurallar:
- Anahtarlar kaynak JSON'daki Türkçe adla BİREBİR aynı olmalı (tırnak, büyük/küçük harf, boşluk, & işareti).
- Her anahtar için [Almanca, İspanyolca] ver; atlama, boş bırakma.
- Almanca: salon/spa sektöründe yerleşik terimler (Haarschnitt, Färben, Strähnen, Maniküre, Pediküre,
  Wimpernverlängerung, Augenbrauen zupfen, Dauerhafte Haarentfernung, Ganzkörpermassage ...). Başlık
  büyük/küçük harf Almanca yazım kurallarına uygun.
- İspanyolca: nötr (İspanya + Latin Amerika'da anlaşılır) terimler. Büyük harf yalnızca ilk sözcük/özel ad.
- Kısa tut: bunlar buton/liste etiketi. Marka adı, ölçü ve rakamları (örn. "30 dk", "3D", "Botox") koru.
- Geçerli TypeScript: çift tırnak, kaçış karakterleri doğru, sondaki virgül serbest.
- Bitince doğrula: kaynak JSON'daki anahtar sayısı = dosyadaki satır sayısı; `node` ile her anahtarın
  karşılığı olduğunu kontrol eden geçici bir betik yaz (geçici klasörde), sonucu raporla.
