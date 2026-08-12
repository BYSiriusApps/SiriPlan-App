import type { CSSProperties } from "react";

export type WebsitePaletteKey = "rose" | "ocean" | "sage" | "dark" | "sunset" | "midnight";

interface WebsitePalette {
  label: string;
  swatch: string;
  primary: string;
  primaryForeground: string;
  accent: string;
  accentForeground: string;
  background: string;
  foreground: string;
}

// oklch değerleri src/app/globals.css'teki dashboard tema bloklarından (root/.ocean/.sage/.sunset/.midnight/.dark) alınmıştır.
export const WEBSITE_PALETTES: Record<WebsitePaletteKey, WebsitePalette> = {
  rose: {
    label: "Pembe Rose",
    swatch: "#f43f5e",
    primary: "oklch(0.52 0.16 345)",
    primaryForeground: "oklch(0.99 0 0)",
    accent: "oklch(0.80 0.09 70)",
    accentForeground: "oklch(0.22 0.04 290)",
    background: "oklch(0.985 0.005 80)",
    foreground: "oklch(0.18 0.02 290)",
  },
  ocean: {
    label: "Okyanus Mavisi",
    swatch: "#0d9488",
    primary: "oklch(0.44 0.13 195)",
    primaryForeground: "oklch(0.99 0 0)",
    accent: "oklch(0.91 0.04 200)",
    accentForeground: "oklch(0.14 0.025 215)",
    background: "oklch(0.99 0.005 210)",
    foreground: "oklch(0.14 0.025 215)",
  },
  sage: {
    label: "Doğa Yeşili",
    swatch: "#047857",
    primary: "oklch(0.43 0.115 150)",
    primaryForeground: "oklch(0.99 0 0)",
    accent: "oklch(0.91 0.035 140)",
    accentForeground: "oklch(0.15 0.025 150)",
    background: "oklch(0.985 0.008 140)",
    foreground: "oklch(0.15 0.025 150)",
  },
  sunset: {
    label: "Turuncu Gün Batımı",
    swatch: "#f97316",
    primary: "oklch(0.58 0.18 40)",
    primaryForeground: "oklch(0.99 0 0)",
    accent: "oklch(0.88 0.06 60)",
    accentForeground: "oklch(0.15 0.025 40)",
    background: "oklch(0.985 0.008 60)",
    foreground: "oklch(0.15 0.025 40)",
  },
  midnight: {
    label: "Gece Yarısı Mor",
    swatch: "#7c3aed",
    primary: "oklch(0.65 0.18 280)",
    primaryForeground: "oklch(0.99 0 0)",
    accent: "oklch(0.65 0.18 280)",
    accentForeground: "oklch(0.12 0.04 280)",
    background: "oklch(0.12 0.04 280)",
    foreground: "oklch(0.92 0.01 280)",
  },
  dark: {
    label: "Gece Modu",
    swatch: "#1e293b",
    primary: "oklch(0.70 0.15 345)",
    primaryForeground: "oklch(0.17 0.03 290)",
    accent: "oklch(0.72 0.10 65)",
    accentForeground: "oklch(0.17 0.03 290)",
    background: "oklch(0.17 0.03 290)",
    foreground: "oklch(0.93 0.01 70)",
  },
};

/**
 * shadcn/ui'ın gerçek --primary/--accent/... token'larını override eder
 * (özel --w-* isimler değil), böylece hem yeni website markup'ı hem de
 * Dialog/Sheet portalına taşınan BookingWizard (var(--primary) kullanıyor)
 * aynı paleti otomatik alır. Bu style objesi hem WebsitePage'in kök
 * wrapper'ına hem de BookingModal'ın DialogContent'ine uygulanmalı —
 * Radix portal DOM ağacını kopardığı için tek noktadan miras yetmez.
 */
export function websiteThemeStyle(key: WebsitePaletteKey | string): CSSProperties {
  const p = WEBSITE_PALETTES[key as WebsitePaletteKey] ?? WEBSITE_PALETTES.rose;
  return {
    "--primary": p.primary,
    "--primary-foreground": p.primaryForeground,
    "--accent": p.accent,
    "--accent-foreground": p.accentForeground,
    "--background": p.background,
    "--foreground": p.foreground,
  } as CSSProperties;
}
