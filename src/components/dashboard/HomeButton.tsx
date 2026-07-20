"use client";

import Link from "next/link";
import { Home } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Sayfa başlıklarının yanına konan "ana sayfaya dön" kısayolu.
 * Her dashboard sayfasının üst başlığında kullanılır.
 */
export function HomeButton() {
  const t = useTranslations("dashboard");
  return (
    <Link
      href="/dashboard"
      title={t("home")}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
    >
      <Home className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{t("home")}</span>
    </Link>
  );
}
