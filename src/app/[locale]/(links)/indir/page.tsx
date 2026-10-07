import type { Metadata } from "next";
import { headers } from "next/headers";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/store-links";

// Instagram "bio'daki tek bağlantı" sayfası. Pazarlama layout'u (menü/footer)
// kasıtlı olarak YOK: mobilde tek ekranda dört büyük buton. Arama sonuçlarında
// ince içerik/kopya sayfa üretmemesi için noindex; asıl SEO sayfaları sitemap'te.
export const metadata: Metadata = {
  title: "SiriPlan'ı İndir",
  description: "SiriPlan — salonunuz için otomatik randevu ve müşteri yönetimi. 14 gün ücretsiz deneyin.",
  robots: { index: false, follow: true },
};

const UTM = "utm_source=instagram&utm_medium=bio&utm_campaign=link";

type LinkItem = { href: string; label: string; sub: string; icon: React.ReactNode; external?: boolean };

const AppleIcon = (
  <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden="true">
    <path d="M16.37 1.43c0 1.14-.46 2.22-1.2 3-.8.85-2.1 1.5-3.17 1.42-.13-1.1.42-2.27 1.14-3 .8-.83 2.2-1.46 3.23-1.42zM20.5 17.3c-.55 1.27-.82 1.84-1.53 2.96-1 1.56-2.4 3.5-4.14 3.52-1.55.02-1.95-1-4.05-.99-2.1.01-2.54 1.01-4.09.99-1.74-.02-3.07-1.77-4.07-3.33C-.2 15.9-.5 10.9 1.4 8.05c1.34-2.02 3.45-3.2 5.43-3.2 2.02 0 3.28 1.1 4.95 1.1 1.62 0 2.6-1.1 4.93-1.1 1.76 0 3.62.96 4.95 2.62-4.35 2.38-3.65 8.6.84 9.83z" />
  </svg>
);
const PlayIcon = (
  <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
    <path fill="#00D7FE" d="M3.6 1.8c-.3.3-.5.8-.5 1.4v17.6c0 .6.2 1.1.5 1.4l.1.1L13.6 12v-.2L3.7 1.7z" />
    <path fill="#FFCE00" d="M16.9 15.3 13.6 12v-.2l3.3-3.3.1.1 3.9 2.2c1.1.6 1.1 1.7 0 2.3l-3.9 2.2z" />
    <path fill="#FF3A44" d="m17 15.2-3.4-3.4L3.6 21.8c.4.4 1 .4 1.7.1z" />
    <path fill="#00F076" d="M17 8.4 5.3 1.8c-.7-.4-1.3-.3-1.7.1l10 9.9z" />
  </svg>
);
const WhatsAppIcon = (
  <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden="true">
    <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.7.3 1.26.49 1.7.63.72.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.05 21.8h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88zM20.46 3.49A11.8 11.8 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.9 11.9 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89a11.8 11.8 0 0 0-3.48-8.42z" />
  </svg>
);
const TrialIcon = (
  <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="17" rx="3" />
    <path d="M8 2v4M16 2v4M3 10h18M9 15l2 2 4-4" />
  </svg>
);
const GlobeIcon = (
  <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" />
  </svg>
);

const SECTORS: { slug: string; img: string; name: string }[] = [
  { slug: "kuafor", img: "kuafor", name: "Kuaför" },
  { slug: "berber", img: "berber", name: "Berber" },
  { slug: "guzellik", img: "guzellik", name: "Güzellik Salonu" },
  { slug: "spa", img: "spa", name: "SPA & Masaj" },
  { slug: "makyaj", img: "makyaj", name: "Makyaj Stüdyosu" },
  { slug: "tattoo", img: "tattoo", name: "Tattoo Studio" },
  { slug: "diyetisyen", img: "diyetisyen", name: "Diyetisyen" },
  { slug: "nail", img: "nail", name: "Nail Salon" },
  { slug: "petkuafor", img: "petkuafor", name: "Pet Kuaför" },
];

const FEATURES = ["WhatsApp & Telegram otomatik hatırlatma", "Online randevu linki", "Kasa, stok ve personel takibi", "Sesli randevu asistanı"];

function MarqueeRow({ items, className }: { items: typeof SECTORS; className: string }) {
  // Aynı liste iki kez: -%50 kayınca kesintisiz döngü.
  const doubled = [...items, ...items];
  return (
    <div className="overflow-hidden" aria-hidden="true">
      <div className={`flex w-max gap-3 ${className}`}>
        {doubled.map((s, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={`/indir/${s.img}.webp`} alt="" width={160} height={160} loading={i < 5 ? "eager" : "lazy"} className="h-28 w-28 shrink-0 rounded-2xl object-cover shadow-lg ring-1 ring-white/20 sm:h-36 sm:w-36" />
        ))}
      </div>
    </div>
  );
}

export default async function IndirPage() {
  const ua = (await headers()).get("user-agent") ?? "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  const trial: LinkItem = {
    href: `/auth/kayit?${UTM}`,
    label: "14 Gün Ücretsiz Dene",
    sub: "Kart yok, 5 dakikada kurulum",
    icon: TrialIcon,
  };
  const appStore: LinkItem = { href: APP_STORE_URL, label: "App Store'dan İndir", sub: "iPhone ve iPad", icon: AppleIcon, external: true };
  const playStore: LinkItem = { href: PLAY_STORE_URL, label: "Google Play'den İndir", sub: "Android", icon: PlayIcon, external: true };
  const stores = isIOS ? [appStore, playStore] : isAndroid ? [playStore, appStore] : [appStore, playStore];
  const items: LinkItem[] = [
    trial,
    ...stores,
    { href: `https://wa.me/905355032634`, label: "WhatsApp ile Ulaşın", sub: "Sorularınızı yanıtlayalım", icon: WhatsAppIcon, external: true },
    { href: `/?${UTM}`, label: "siriplan.com", sub: "Tüm özellikler ve fiyatlar", icon: GlobeIcon },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#022058] bg-gradient-to-b from-[#022058] via-[#031a4a] to-[#010f2e] pb-12 text-white">
      {/* Arka plan ışıkları */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#e8c15a]/25 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute top-[28rem] -right-24 h-72 w-72 rounded-full bg-pink-500/20 blur-3xl" />

      {/* Kayan mutlu esnaf kolajı */}
      <div className="space-y-3 pt-6">
        <MarqueeRow items={SECTORS} className="indir-row-l" />
        <MarqueeRow items={[...SECTORS].reverse()} className="indir-row-r" />
      </div>

      <div className="relative mx-auto flex w-full max-w-md flex-col items-center px-4 sm:max-w-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192x192.png" alt="SiriPlan" width={80} height={80} className="indir-rise mt-4 rounded-3xl shadow-xl ring-2 ring-[#e8c15a]/70" />

        <h1 className="indir-rise mt-5 text-center text-3xl font-extrabold leading-tight sm:text-4xl" style={{ animationDelay: "80ms" }}>
          Defteri bırakın,<br />
          <span className="indir-gradient-text">randevular kendi kendine dolsun</span>
        </h1>
        <p className="indir-rise mt-3 text-center text-sm text-white/80 sm:text-base" style={{ animationDelay: "160ms" }}>
          Güzellik salonu, kuaför, berber, spa, klinik… Randevu, müşteri, kasa ve stok tek uygulamada. Müşteriniz randevusunu unutmasın, siz telefonla uğraşmayın.
        </p>

        <ul className="indir-rise mt-4 flex flex-wrap justify-center gap-2" style={{ animationDelay: "220ms" }}>
          {FEATURES.map((f) => (
            <li key={f} className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur">
              ✓ {f}
            </li>
          ))}
        </ul>

        {/* Bağlantılar */}
        <ul className="mt-8 w-full space-y-3">
          {items.map((it, i) => (
            <li key={it.label} className="indir-rise" style={{ animationDelay: `${280 + i * 70}ms` }}>
              <a
                href={it.href}
                {...(it.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className={
                  "group relative flex items-center gap-4 overflow-hidden rounded-2xl px-4 py-3.5 transition duration-200 hover:-translate-y-0.5 hover:shadow-2xl active:scale-[0.98] " +
                  (i === 0
                    ? "indir-shine indir-pulse bg-gradient-to-r from-[#e8c15a] to-[#f6d77a] text-[#022058] shadow-lg"
                    : "border border-white/15 bg-white/10 backdrop-blur hover:border-[#e8c15a]/60 hover:bg-white/20")
                }
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center transition-transform duration-200 group-hover:scale-110">{it.icon}</span>
                <span className="flex flex-1 flex-col">
                  <span className="text-base font-bold leading-tight">{it.label}</span>
                  <span className={"text-xs " + (i === 0 ? "text-[#022058]/75" : "text-white/70")}>{it.sub}</span>
                </span>
                <span aria-hidden="true" className="text-xl transition-transform duration-200 group-hover:translate-x-1">›</span>
              </a>
            </li>
          ))}
        </ul>

        {/* Sektör kartları */}
        <h2 className="mt-12 text-center text-xl font-bold">Hangi sektördesiniz?</h2>
        <p className="mt-1 text-center text-sm text-white/70">Sektörünüze özel sayfayı görün</p>
        <ul className="mt-5 grid w-full grid-cols-3 gap-3">
          {SECTORS.map((s) => (
            <li key={s.slug}>
              <a href={`/kategori/${s.slug}?${UTM}`} className="group relative block aspect-square overflow-hidden rounded-2xl ring-1 ring-white/20 transition duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(232,193,90,0.35)] hover:ring-[#e8c15a]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/indir/${s.img}.webp`} alt={s.name} width={320} height={320} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-2 pb-2 pt-8 text-center text-xs font-bold leading-tight transition group-hover:text-[#f6d77a] sm:text-sm">
                  {s.name}
                </span>
              </a>
            </li>
          ))}
        </ul>

        <a href={`/auth/kayit?${UTM}`} className="indir-pulse mt-8 rounded-full bg-[#e8c15a] px-6 py-3 text-sm font-bold text-[#022058] transition hover:-translate-y-0.5 hover:bg-[#f6d77a]">
          Sizin sektörünüz için ücretsiz başlayın →
        </a>

        <p className="mt-10 text-xs text-white/40">© SiriPlan · BY Sirius Group</p>
      </div>
    </main>
  );
}
