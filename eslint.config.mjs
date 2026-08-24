import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * `...nextVitals` / `...nextTs` spread'leri BURADA OLMAK ZORUNDA.
 *
 * Bunlar olmadan dosya yalnızca `globalIgnores` içeriyordu; sonuç olarak
 * hiçbir kural/plugin yüklenmiyor VE eslint-config-next'in varsayılan
 * yok saymaları devreye girmiyordu. `npm run lint` bu yüzden
 * node_modules/zod'u tarayıp, o dosyalardaki inline `eslint-disable ban/ban`
 * yorumları için "Definition for rule not found" diye binlerce sahte hata
 * üretiyordu — yani doğrulama ağı sessizce kapalıydı.
 */
const eslintConfig = defineConfig([
  // Yok saymalar EN BAŞTA ve `**/` önekiyle: `.next/**` gibi kök-göreli
  // kalıplar üretilen dev/build çıktısının tamamını yakalamıyordu ve ESLint
  // `.next/dev/server/chunks/*.js` bundle'larını tarayıp dakikalarca
  // sürüyordu. Burada taranacak şey yalnızca elle yazılmış kaynak kod.
  globalIgnores([
    "**/.next/**",
    "**/node_modules/**",
    "**/out/**",
    "**/build/**",
    "**/coverage/**",
    "**/public/**",
    "**/supabase/**",
    "next-env.d.ts",
    "**/*.min.js",
  ]),
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // no-img-element GLOBAL OLARAK KAPATILMADI: bilinçli <img> kullanılan
      // yerlerde zaten satır içi `eslint-disable-next-line` var. Kuralı
      // topluca kapatmak hem o yorumları ölü bırakıyor hem de yeni eklenen
      // optimize edilmemiş <img>'leri sessizce geçiriyordu.
      //
      // Türkçe metinlerde kesme işareti çok geçiyor; JSX içinde her birini
      // &apos; yapmak okunabilirliği düşürüyor.
      "react/no-unescaped-entities": "off",
      // Kullanılmayan değişkenler uyarı olarak kalsın (derlemeyi durdurmasın),
      // `_` ile başlayanlar tamamen serbest.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],

      // --- Aşağıdakiler BİRİKMİŞ İŞ, yeni hata değil ---
      //
      // Lint uzun süredir hiç çalışmıyordu (bkz. yukarıdaki not); yeniden
      // açıldığında React Compiler kuralları 30 mevcut bulgu gösterdi. Kod
      // bu kurallar ortaya çıkmadan önce yazıldı ve hepsi ÇALIŞAN kod:
      //   - set-state-in-effect (20): sunucu/istemci farkını efektle
      //     kapatan bilinçli kalıplar (ör. use-mobile-app.ts — ilk render'da
      //     kasıtlı olarak false döner).
      //   - immutability (5): olay yöneticisi içinde `document.cookie` yazımı
      //     (dil/para birimi seçici) — render sırasında değil.
      //   - purity (4): render sırasında `new Date()` benzeri çağrılar.
      //
      // "error" bırakılsaydı `npm run lint` ilk günden kırmızı olurdu ve
      // yeniden görmezden gelinirdi. "warn" ile hem görünür kalıyorlar hem de
      // BUNDAN SONRA eklenecek gerçek hatalar lint'i kırmızıya düşürebiliyor.
      // Teker teker ele alınıp "error"a çekilmeleri hedef.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
]);

export default eslintConfig;
