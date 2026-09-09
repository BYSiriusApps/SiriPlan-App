import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

// Mağazalar yayına girdikçe burayı aç — kod tekrar yazılmaz, rozet linke döner.
export const PLAY_STORE_LIVE = true;
export const APP_STORE_LIVE = false;

export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.siriplan.app";
// App Store onayı gelince gerçek URL buraya (apps.apple.com/app/idXXXXXXXXXX).
export const APP_STORE_URL = "";

function GooglePlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" aria-hidden="true">
      <path d="M3.6 2.4a1 1 0 0 0-.5.9v17.4a1 1 0 0 0 .5.9l9.8-9.6L3.6 2.4Z" fill="#00D0FF" />
      <path d="m17.4 8.3-3.2-1.8-3.5 3.5 3.5 3.5 3.3-1.9c1-.6 1-2.8-.1-3.3Z" fill="#FFCE00" />
      <path d="M13.4 12 4 21.4c.4.3 1 .3 1.6 0l11.5-6.6L13.4 12Z" fill="#FF3D47" />
      <path d="M4 2.6 13.4 12l3.7-2.8L5.6 2.6c-.6-.3-1.2-.3-1.6 0Z" fill="#00F076" />
    </svg>
  );
}

function AppleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 fill-current" aria-hidden="true">
      <path d="M17.05 12.04c-.03-2.9 2.37-4.29 2.48-4.36-1.35-1.98-3.46-2.25-4.21-2.28-1.79-.18-3.5 1.05-4.41 1.05-.92 0-2.32-1.03-3.82-1-1.96.03-3.78 1.14-4.79 2.9-2.05 3.55-.52 8.8 1.47 11.68.97 1.41 2.13 2.99 3.65 2.93 1.47-.06 2.02-.95 3.79-.95 1.76 0 2.26.95 3.81.92 1.57-.03 2.57-1.44 3.53-2.85 1.11-1.63 1.57-3.21 1.6-3.29-.04-.02-3.06-1.18-3.09-4.68ZM14.2 3.75c.81-.98 1.36-2.35 1.21-3.71-1.17.05-2.59.78-3.43 1.76-.75.87-1.41 2.26-1.23 3.59 1.31.1 2.64-.66 3.45-1.64Z" />
    </svg>
  );
}

function Badge({
  href,
  glyph,
  topLine,
  bottomLine,
  disabled,
}: {
  href?: string;
  glyph: ReactNode;
  topLine: string;
  bottomLine: string;
  disabled?: boolean;
}) {
  const inner = (
    <>
      {glyph}
      <span className="flex flex-col leading-none text-left">
        <span className="text-[10px] uppercase tracking-wide opacity-80">{topLine}</span>
        <span className="text-base font-semibold mt-0.5">{bottomLine}</span>
      </span>
    </>
  );

  const cls =
    "inline-flex items-center gap-3 rounded-xl border px-4 py-2.5 min-w-[168px] transition-colors";

  if (disabled || !href) {
    return (
      <span
        className={`${cls} border-border bg-muted/50 text-muted-foreground cursor-default`}
        aria-disabled="true"
      >
        {inner}
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${cls} border-foreground/15 bg-foreground text-background hover:bg-foreground/90`}
    >
      {inner}
    </a>
  );
}

export async function AppStoreBadges({ className = "" }: { className?: string }) {
  const t = await getTranslations("appDownload");

  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      <Badge
        href={PLAY_STORE_LIVE ? PLAY_STORE_URL : undefined}
        disabled={!PLAY_STORE_LIVE}
        glyph={<GooglePlayGlyph />}
        topLine={PLAY_STORE_LIVE ? t("getItOn") : t("comingSoon")}
        bottomLine="Google Play"
      />
      <Badge
        href={APP_STORE_LIVE ? APP_STORE_URL : undefined}
        disabled={!APP_STORE_LIVE}
        glyph={<AppleGlyph />}
        topLine={APP_STORE_LIVE ? t("downloadOn") : t("comingSoon")}
        bottomLine="App Store"
      />
    </div>
  );
}
