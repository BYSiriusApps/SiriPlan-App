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
    <main className="min-h-screen bg-[#022058] bg-gradient-to-b from-[#022058] to-[#010f2e] px-4 py-10 text-white">
      <div className="mx-auto flex w-full max-w-md flex-col items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192x192.png" alt="SiriPlan" width={96} height={96} className="rounded-3xl shadow-lg ring-2 ring-[#e8c15a]/60" />
        <h1 className="mt-4 text-2xl font-bold">SiriPlan</h1>
        <p className="mt-1 text-center text-sm text-white/75">
          Güzellik salonu ve kuaförler için otomatik randevu, müşteri ve kasa yönetimi
        </p>

        <ul className="mt-8 w-full space-y-3">
          {items.map((it, i) => (
            <li key={it.label}>
              <a
                href={it.href}
                {...(it.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className={
                  "flex items-center gap-4 rounded-2xl px-4 py-3.5 transition active:scale-[0.98] " +
                  (i === 0
                    ? "bg-[#e8c15a] text-[#022058] shadow-lg hover:bg-[#f0cd6e]"
                    : "border border-white/15 bg-white/10 hover:bg-white/15")
                }
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center">{it.icon}</span>
                <span className="flex flex-col">
                  <span className="text-base font-semibold leading-tight">{it.label}</span>
                  <span className={"text-xs " + (i === 0 ? "text-[#022058]/70" : "text-white/65")}>{it.sub}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-xs text-white/40">© SiriPlan · BY Sirius Group</p>
      </div>
    </main>
  );
}
