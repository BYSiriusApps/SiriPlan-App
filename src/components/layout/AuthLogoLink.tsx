"use client";

import { usePathname } from "next/navigation";

/**
 * /auth/* sayfalarının üstündeki Siriplan logosu normalde pazarlama
 * anasayfasına ("/") döner. Ancak plan-sec sadece giriş yapmış, org'u olan
 * kullanıcılara gösterilir (deneme bitti/ödeme uyarısı/e-posta-SMS linki ile
 * gelinir) — bu ekranda anasayfaya değil doğrudan panele (Genel Görünüm)
 * dönmek daha doğru, aksi halde kullanıcı panele dönmekte zorlanıyor.
 */
export function AuthLogoLink() {
  const pathname = usePathname();
  const isPlanSec = pathname?.startsWith("/auth/plan-sec");

  return (
    <a href={isPlanSec ? "/dashboard" : "/"} className="inline-flex items-center gap-2 group">
      <img
        src="/icons/icon-mark.png"
        alt="Siriplan"
        className="w-10 h-10 rounded-xl shadow-lg group-hover:scale-105 transition-transform"
      />
      <span className="text-2xl font-bold text-foreground">Siriplan</span>
    </a>
  );
}
