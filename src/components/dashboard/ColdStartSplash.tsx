"use client";

import { useState } from "react";

/**
 * Panel açılış ekranı — YALNIZCA uygulamanın ilk açılışında.
 *
 * SORUN: `app/dashboard/loading.tsx` bu markalı tam ekran görseli doğrudan
 * basıyordu. Next.js'te bir segmentteki `loading.tsx` yalnızca o segmentin
 * `page.tsx`'ini değil, ALTINDAKİ TÜM alt rotaları da bir `<Suspense>` sınırına
 * sarar (bkz. next/dist/docs/.../file-conventions/loading.md). Dolayısıyla
 * Takvim → Müşteriler gibi her panel içi geçişte, kullanıcı zaten uygulamanın
 * içindeyken lacivert açılış ekranı tekrar tekrar tüm ekranı kaplıyordu.
 *
 * ÇÖZÜM: Açılış görseli sadece "soğuk başlangıçta" (uygulama/sekme ilk kez
 * yüklenirken) anlamlı. `markWarmStart()` panel kabuğu hidrate olduğunda
 * çalışır; modül değişkeni sayfa yenilenene kadar canlı kaldığı için sonraki
 * istemci geçişlerinde bu bileşen tam ekran yerine ince bir ilerleme çizgisi
 * gösterir. Sunucuda değişken her istekte yeniden `false` başlar; bu doğrudur,
 * çünkü sunucuda render edilen fallback zaten gerçek bir sayfa yüklemesidir.
 */
let warmStart = false;

export function markWarmStart() {
  warmStart = true;
}

export function ColdStartSplash() {
  // Karar İLK RENDER'da veriliyor, efektte değil: efekt boyamadan SONRA
  // çalıştığı için her geçişte tam ekran açılış görselinin bir kare
  // parlamasına yol açardı — düzeltmeye çalıştığımız sorunun ta kendisi.
  //
  // Hidrasyon güvenli: sunucuda `warmStart` her istekte false başlar ve bu
  // fallback yalnızca gerçek bir sayfa yüklemesinde sunucuda render edilir;
  // o anda istemcide de modül yeni yüklendiği için değer yine false'tur.
  // İstemci içi geçişlerde bu bileşen sunucu HTML'inden hidrate edilmez,
  // sıfırdan render edilir — yani uyuşmazlık oluşabilecek bir durum yok.
  const [warm] = useState(() => warmStart);

  if (warm) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 h-0.5 overflow-hidden bg-primary/10">
        <div className="h-full w-1/3 bg-primary animate-route-progress" />
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 overflow-hidden"
      style={{ background: "radial-gradient(circle at 50% 35%, #0c2f74 0%, #022058 55%, #010f36 100%)" }}
    >
      {/* Dekoratif bulanık katmanlar — SADECE geniş ekranda. blur-3xl (64px)
          288px-lik iki katmanda mobil GPU-da pahalıdır ve tam da uygulamanın
          en yavaş anında, soğuk başlangıçta çalışır. Telefonda logo zaten
          ekranı doldurduğu için görsel kayıp ihmal edilebilir. */}
      <div className="absolute -top-24 -left-16 w-72 h-72 rounded-full bg-primary/20 blur-3xl animate-soft-float hidden sm:block" />
      <div className="absolute -bottom-24 -right-16 w-72 h-72 rounded-full bg-amber-400/10 blur-3xl animate-soft-float hidden sm:block" style={{ animationDelay: "-4s" }} />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/icon-mark.png"
        alt="Siriplan"
        className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-[2rem] shadow-2xl shadow-black/40"
      />
      <div className="relative text-center space-y-1">
        <p className="text-2xl font-bold tracking-tight text-white">
          Siri<span className="text-amber-400">Plan</span>
        </p>
        <p className="text-xs font-medium tracking-[0.2em] text-white/50 uppercase">by BySirius</p>
      </div>

      <div className="relative w-8 h-8 border-[3px] border-white/20 border-t-white/80 rounded-full animate-spin" />
    </div>
  );
}
