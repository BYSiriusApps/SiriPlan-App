/**
 * Native uygulamada (TWA) start_url="/dashboard" acildiginda, sunucu auth/org
 * kontrolunu (dashboard/layout.tsx) beklerken Next.js bu dosyayi otomatik
 * Suspense fallback olarak gosterir. Amac: Android'in sabit-boyutlu native
 * splash ikonu kapandiktan sonra beyaz/bos bir an yasanmadan, ayni lacivert
 * tonda tam ekran buyuk logoyla kesintisiz gecis hissi vermek (bkz.
 * public/manifest.json background_color — ayni #022058 tonu).
 */
export default function DashboardLoading() {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 overflow-hidden"
      style={{ background: "radial-gradient(circle at 50% 35%, #0c2f74 0%, #022058 55%, #010f36 100%)" }}
    >
      <div className="absolute -top-24 -left-16 w-72 h-72 rounded-full bg-primary/20 blur-3xl animate-soft-float" />
      <div className="absolute -bottom-24 -right-16 w-72 h-72 rounded-full bg-amber-400/10 blur-3xl animate-soft-float" style={{ animationDelay: "-4s" }} />

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
