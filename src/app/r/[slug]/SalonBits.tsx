"use client";

import { MapPin, Star as StarIcon, Instagram, Phone, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Organization } from "@/types/database";
import { SUPPORTED_LANGUAGES, type LanguageCode } from "@/lib/languages";
import { WEEKDAY_KEYS } from "./booking-shared";

// lucide-react'ta marka ikonu olarak TikTok bulunmuyor (Instagram/Facebook gibi
// birkaç istisna dışında marka logoları desteklenmiyor) — resmi TikTok notası
// buraya inline SVG olarak eklendi, ek bir paket bağımlılığı gerekmesin diye.
export function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M16.6 5.82c-.9-.86-1.42-2.05-1.42-3.37h-3.03v13.6c0 1.55-1.26 2.8-2.8 2.8a2.8 2.8 0 0 1-2.8-2.8 2.8 2.8 0 0 1 2.8-2.8c.26 0 .5.03.74.1V10.3a5.8 5.8 0 0 0-.74-.05A5.83 5.83 0 0 0 3.55 16.08 5.83 5.83 0 0 0 9.38 21.9a5.83 5.83 0 0 0 5.83-5.82V9.01a8.36 8.36 0 0 0 4.88 1.56V7.55c-1.24 0-2.39-.4-3.33-1.08-.06-.04-.11-.09-.16-.13Z" />
    </svg>
  );
}

export function LanguageSwitcher({
  lang, onChange,
}: {
  lang: LanguageCode;
  onChange: (l: LanguageCode) => void;
}) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      {SUPPORTED_LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          title={l.name}
          aria-label={l.name}
          onClick={() => onChange(l.code)}
          className={`text-base leading-none p-1.5 rounded-lg transition-all ${
            lang === l.code ? "bg-primary/10 ring-1 ring-primary/30" : "opacity-50 hover:opacity-90"
          }`}
        >
          {l.flag}
        </button>
      ))}
    </div>
  );
}

/**
 * Yol tarifi / değerlendirme / sosyal medya kısayolları.
 *
 * `tone` sadece görsel: "solid" kapak fotoğrafının üstünde (koyu zemin),
 * "outline" normal kart zemininde kullanılır.
 */
export function QuickLinks({
  org, tone = "outline", className = "",
}: {
  org: Organization;
  tone?: "solid" | "outline";
  className?: string;
}) {
  const t = useTranslations("booking.public");
  const has = org.location_url || org.google_review_url || org.instagram_handle || org.tiktok_handle || org.phone;
  if (!has) return null;

  const chip =
    tone === "solid"
      ? "bg-white/15 text-white backdrop-blur-sm border border-white/25 hover:bg-white/25"
      : "border border-current opacity-90 hover:opacity-100";

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {org.location_url && (
        <a
          href={org.location_url}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-colors ${chip}`}
        >
          <MapPin className="h-3.5 w-3.5" /> {t("directionsButton")}
        </a>
      )}
      {org.phone && (
        <a
          href={`tel:${org.phone}`}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-colors ${chip}`}
        >
          <Phone className="h-3.5 w-3.5" /> {t("callButton")}
        </a>
      )}
      {org.google_review_url && (
        <a
          href={org.google_review_url}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-colors ${chip}`}
        >
          <StarIcon className="h-3.5 w-3.5" /> {t("reviewsButton")}
        </a>
      )}
      {org.instagram_handle && (
        <a
          href={`https://instagram.com/${org.instagram_handle.replace(/^@/, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram"
          className={`inline-flex items-center justify-center w-9 h-9 rounded-full transition-colors shrink-0 ${chip}`}
        >
          <Instagram className="h-4 w-4" />
        </a>
      )}
      {org.tiktok_handle && (
        <a
          href={`https://www.tiktok.com/@${org.tiktok_handle.replace(/^@/, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="TikTok"
          className={`inline-flex items-center justify-center w-9 h-9 rounded-full transition-colors shrink-0 ${chip}`}
        >
          <TikTokIcon className="h-4 w-4" />
        </a>
      )}
    </div>
  );
}

/** Vitrin şablonundaki "Çalışma Saatleri" kutusu. Tüm günler kapalıysa hiç çizilmez. */
export function WorkingHours({ org }: { org: Organization }) {
  const t = useTranslations("booking.public");
  const hours = (org.working_hours_json ?? {}) as Record<string, { open: string; close: string } | null>;
  const anyOpen = WEEKDAY_KEYS.some((k) => hours[k]?.open && hours[k]?.close);
  if (!anyOpen) return null;

  // Bugünün satırı vurgulanır — getDay() Pazar=0 döner, WEEKDAY_KEYS Pazartesi başlar.
  const todayKey = WEEKDAY_KEYS[(new Date().getDay() + 6) % 7];

  return (
    <div className="rounded-2xl border border-border/70 bg-card/70 backdrop-blur-sm p-4">
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/70 mb-3">
        <Clock className="h-3.5 w-3.5" /> {t("workingHoursTitle")}
      </p>
      <ul className="space-y-1.5 text-sm">
        {WEEKDAY_KEYS.map((key) => {
          const h = hours[key];
          const isToday = key === todayKey;
          return (
            <li
              key={key}
              className={`flex items-center justify-between gap-3 ${isToday ? "font-semibold text-primary" : "text-muted-foreground"}`}
            >
              <span>{t(`weekdays.${key}`)}</span>
              <span className="tabular-nums">{h?.open && h?.close ? `${h.open} – ${h.close}` : t("closedLabel")}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
