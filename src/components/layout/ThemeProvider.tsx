"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ReactNode } from "react";

/**
 * `nonce`: next-themes, tema seçimini ilk boyamadan ÖNCE uygulamak için
 * <head>'e bir inline script basar (FOUC engelleme). Panel sayfalarında CSP
 * nonce'lu çalıştığı için (bkz. lib/csp.ts) bu script imzalanmazsa tarayıcı
 * onu engeller ve her sayfa açılışında tema titremesi olur. Nonce'suz
 * yollarda değer undefined'dır ve öznitelik hiç basılmaz.
 */
export function ThemeProvider({ children, nonce }: { children: ReactNode; nonce?: string }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      themes={["light", "dark", "ocean", "sage", "sunset", "midnight"]}
      enableSystem={false}
      disableTransitionOnChange={false}
      nonce={nonce}
    >
      {children}
    </NextThemesProvider>
  );
}
