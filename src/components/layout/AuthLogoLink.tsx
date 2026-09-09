"use client";

import { usePathname } from "next/navigation";

/**
 * /auth/* sayfalarının üstündeki Siriplan logosu normalde pazarlama
 * anasayfasına ("/") döner. İstisnalar:
 *  - plan-sec: yalnızca giriş yapmış, org'u olan kullanıcılara gösterilir
 *    (deneme bitti/ödeme/e-posta linki) — panele dönmek daha doğru.
 *  - davet: davet edilen kişi henüz müşteri değil; logoya dokununca pazarlama
 *    anasayfasına ("Ücretsiz Başla" çağrılarına) atılırsa kaydolma akışından
 *    kopuyor. Bu ekranda logo bir bağlantı değil, sadece marka işareti.
 */
export function AuthLogoLink() {
  const pathname = usePathname();
  const isPlanSec = pathname?.startsWith("/auth/plan-sec");
  const isDavet = pathname?.startsWith("/auth/davet");

  const inner = (
    <>
      <img
        src="/icons/icon-mark.png"
        alt="Siriplan"
        className="w-10 h-10 rounded-xl shadow-lg group-hover:scale-105 transition-transform"
      />
      <span className="text-2xl font-bold text-foreground">Siriplan</span>
    </>
  );

  if (isDavet) {
    return <span className="inline-flex items-center gap-2">{inner}</span>;
  }

  return (
    <a href={isPlanSec ? "/dashboard" : "/"} className="inline-flex items-center gap-2 group">
      {inner}
    </a>
  );
}
