"use client";

import { useState } from "react";
import type { Locale as DateFnsLocale } from "date-fns";
import type { LanguageCode } from "@/lib/languages";
import type { SalonData } from "./booking-shared";
import { BookingWizard } from "./BookingWizard";
import { PhotoLightbox } from "./PhotoLightbox";
import { LanguageSwitcher, QuickLinks } from "./SalonBits";
import { useTranslations } from "next-intl";

/**
 * ŞABLON 1 — "Klasik / Hızlı Randevu".
 *
 * Amaç: en az tıklamayla randevu. Ziyaretçi sayfayı açtığı anda hizmet listesi
 * ve adım göstergesi ekranda; kapak/tanıtım yalnızca ince bir üst şerit.
 * Website modu kapalıysa (Starter plan) kapak şeridi hiç çizilmez, geriye
 * yalın randevu formu kalır — bu, özelliğin ücretli sınırıdır.
 */
export function ClassicLayout({
  salon, dateLocale, lang, onLangChange, onDetectedLanguage, websiteMode,
}: {
  salon: SalonData;
  dateLocale: DateFnsLocale;
  lang: LanguageCode;
  onLangChange: (l: LanguageCode) => void;
  onDetectedLanguage: (l: LanguageCode) => void;
  websiteMode: boolean;
}) {
  const t = useTranslations("booking.public");
  const { org } = salon;
  const [lightbox, setLightbox] = useState<{ photos: { id: string; url: string }[]; index: number } | null>(null);

  const showBanner =
    websiteMode &&
    (org.cover_url || org.website_tagline || org.location_url || org.google_review_url ||
      org.instagram_handle || org.tiktok_handle || org.facebook_handle || org.linkedin_handle);

  return (
    <>
      {/* Website modu: kapak + tanıtım + kısayollar */}
      {showBanner && (
        <div className="relative">
          {org.cover_url && (
            <div className="relative h-44 sm:h-64 w-full overflow-hidden">
              <img src={org.cover_url} alt={org.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 max-w-xl mx-auto px-4 pb-4">
                <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white drop-shadow-sm text-balance">
                  {org.name}
                </h1>
                {org.city && <p className="text-sm text-white/80">{org.city}</p>}
              </div>
            </div>
          )}
          <div className="max-w-xl mx-auto px-4 py-4 space-y-3">
            {org.website_tagline && (
              <p className="text-sm leading-relaxed text-muted-foreground">{org.website_tagline}</p>
            )}
            <QuickLinks org={org} />
          </div>
        </div>
      )}

      {/* Salon başlığı (logo + dil) — kapak varsa isim yukarıda çizildiği için sadeleşir */}
      <div className="relative bg-card/90 backdrop-blur-sm border-y border-border/70">
        <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-primary" />
        <div className="max-w-xl mx-auto p-4 flex items-center gap-3.5">
          {org.logo_url ? (
            <img src={org.logo_url} alt={org.name} className="rounded-2xl object-cover shadow-md ring-1 ring-border/60 shrink-0" style={{ width: 52, height: 52 }} />
          ) : (
            <div
              className="rounded-2xl flex items-center justify-center text-white font-heading font-bold text-xl shadow-md shrink-0"
              style={{ width: 52, height: 52, background: "linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--accent) 60%, var(--primary)))" }}
            >
              {org.name[0]}
            </div>
          )}
          <div className="min-w-0 flex-1">
            {/* truncate DEĞİL: 390px ekranda dil seçici ile birlikte uzun salon
                adları "BY Sirius Yönet…" diye kesiliyordu. İki satıra sarsın. */}
            <h2 className="font-heading font-bold text-lg sm:text-xl leading-tight line-clamp-2">{org.name}</h2>
            {org.city && <p className="text-sm text-muted-foreground">{org.city}</p>}
          </div>
          <LanguageSwitcher lang={lang} onChange={onLangChange} />
        </div>
      </div>

      <div className="relative max-w-xl mx-auto p-4 py-8">
        <BookingWizard
          salon={salon}
          dateLocale={dateLocale}
          onDetectedLanguage={onDetectedLanguage}
          onPhotoOpen={(photos, index) => setLightbox({ photos, index })}
        />
      </div>

      <PhotoLightbox
        photos={lightbox?.photos ?? []}
        index={lightbox ? lightbox.index : null}
        onClose={() => setLightbox(null)}
        onNavigate={(index) => setLightbox((l) => (l ? { ...l, index } : l))}
        closeLabel={t("closeLabel")}
      />
    </>
  );
}
