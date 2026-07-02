"use client";

import Link from "next/link";
import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Menu, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemePicker } from "@/components/layout/ThemePicker";
import { useTranslations } from "next-intl";

const NAV_HREFS = [
  { href: "/ozellikler", key: "features" },
  { href: "/fiyatlar",   key: "pricing"  },
  { href: "/sss",        key: "faq"      },
  { href: "/blog",       key: "blog"     },
  { href: "/iletisim",   key: "contact"  },
] as const;

const LOCALES = [
  { code: "tr", label: "TR", flag: "🇹🇷" },
  { code: "en", label: "EN", flag: "🇬🇧" },
  { code: "ru", label: "RU", flag: "🇷🇺" },
  { code: "ar", label: "AR", flag: "🇸🇦" },
];

function getActiveLocale(): string {
  if (typeof document === "undefined") return "tr";
  const match = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
  return match ? match[1] : "tr";
}

export function Navbar() {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const [activeLocale, setActiveLocale] = useState<string>("tr");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    setActiveLocale(getActiveLocale());
  }, []);

  function switchLocale(code: string) {
    document.cookie = `NEXT_LOCALE=${code};path=/;max-age=31536000;samesite=lax`;
    setActiveLocale(code);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg brand-gradient flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">
            Siri<span className="text-primary">plan</span>
          </span>
          <span className="hidden md:inline text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            by BySirius
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV_HREFS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t(l.key)}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Locale switcher */}
          <div className="hidden md:flex items-center gap-0.5 bg-muted rounded-lg p-1">
            {LOCALES.map((l) => (
              <button
                key={l.code}
                onClick={() => switchLocale(l.code)}
                disabled={isPending}
                title={l.label}
                className={`flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md transition-all ${
                  activeLocale === l.code
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                }`}
              >
                <span className="text-sm leading-none">{l.flag}</span>
                <span>{l.label}</span>
              </button>
            ))}
          </div>

          <ThemePicker />

          <Link href="/auth/giris" className="hidden md:block">
            <Button variant="ghost" size="sm">
              {t("login")}
            </Button>
          </Link>
          <Link href="/auth/kayit" className="hidden md:block">
            <Button size="sm" className="bg-primary hover:bg-primary/90 shadow-sm">
              {t("startFree")}
            </Button>
          </Link>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-border bg-background px-4 py-4 space-y-3">
          {NAV_HREFS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              {t(l.key)}
            </Link>
          ))}
          {/* Mobile locale switcher */}
          <div className="pt-2 pb-1">
            <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wide">{t("language")}</p>
            <div className="flex gap-1.5">
              {LOCALES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => { switchLocale(l.code); setOpen(false); }}
                  className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border transition-all ${
                    activeLocale === l.code
                      ? "border-primary text-primary bg-primary/5"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <span className="text-sm leading-none">{l.flag}</span>
                  <span>{l.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="pt-3 flex gap-2">
            <Link href="/auth/giris" className="flex-1">
              <Button variant="outline" size="sm" className="w-full">
                {t("login")}
              </Button>
            </Link>
            <Link href="/auth/kayit" className="flex-1">
              <Button size="sm" className="w-full bg-primary hover:bg-primary/90">
                {t("startFree")}
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
