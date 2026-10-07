"use client";

import NextLink from "next/link";
import { useState, useTransition } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemePicker } from "@/components/layout/ThemePicker";
import { FlagIcon } from "./FlagIcon";
import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";

const NAV_HREFS = [
  { href: "/ozellikler", key: "features" },
  { href: "/fiyatlar",   key: "pricing"  },
  { href: "/sss",        key: "faq"      },
  { href: "/blog",       key: "blog"     },
  { href: "/iletisim",   key: "contact"  },
] as const;

const LOCALES = [
  { code: "tr", label: "TR", name: "Türkçe" },
  { code: "en", label: "EN", name: "English" },
  { code: "ru", label: "RU", name: "Русский" },
  { code: "ar", label: "AR", name: "العربية" },
] as const;

export function Navbar() {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const activeLocale = useLocale();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const currentLocaleMeta = LOCALES.find((l) => l.code === activeLocale) ?? LOCALES[0];

  // `/auth/*` gibi [locale] dışındaki bir sayfadan pazarlama sitesine geri
  // dönmeden dil değiştirilemez — ama Navbar zaten yalnızca pazarlama
  // sayfalarında render edildiği için pathname burada her zaman [locale]
  // altındaki (locale-neutral) bir yoldur.
  function switchLocale(code: (typeof LOCALES)[number]["code"]) {
    startTransition(() => {
      router.replace(pathname, { locale: code });
    });
  }

  // backdrop-blur MOBİLDE KASITLI OLARAK KAPALI. Sticky bir başlıkta blur,
  // sayfa her kaydırıldığında arkasındaki alanın yeniden bulanıklaştırılmasını
  // (her karede GPU işi) gerektiriyor; orta seviye Android telefonlarda
  // kaydırma gözle görülür şekilde takılıyordu. Mobilde bunun yerine neredeyse
  // opak bir zemin kullanıyoruz — görsel olarak fark edilmiyor ama kaydırma
  // boyunca hiç blur hesaplanmıyor. md ve üzerinde (masaüstü, yeterli GPU)
  // cam görünüm aynen korunuyor.
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 md:bg-background/80 md:backdrop-blur-xl md:supports-[backdrop-filter]:bg-background/60">
      {/* flex-wrap sadece güvenlik ağı: normal şartlarda tek satıra sığar,
          ama örn. Rusça gibi uzun buton metinlerinde çok dar bir telefonda
          taşma/üst üste binme yerine ikinci satıra düzgünce kayar. */}
      <div className="container mx-auto px-4 py-2.5 md:h-16 md:py-0 flex flex-wrap items-center justify-between gap-y-2 md:flex-nowrap">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <img
            src="/icons/icon-mark.png"
            alt="SiriPlan"
            className="w-8 h-8 rounded-lg shadow-sm"
          />
          <span className="font-bold text-lg tracking-tight">
            Siri<span className="text-muted-foreground font-medium">(us)</span><span className="text-primary">Plan</span>
          </span>
          <span className="hidden xl:inline text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            by BySirius
          </span>
        </Link>

        {/* Desktop nav */}
        {/* prefetch: TÜM pazarlama sayfaları dinamik render ediliyor (dil çerezden
            okunuyor, bkz. i18n/request.ts). Next.js dinamik rotaları VARSAYILAN
            OLARAK hiç prefetch etmez — loading.js yoksa tıklamada tam sunucu
            gidiş-dönüşü olur (next/dist/docs/.../link.md). Sekmeler arası geçişin
            yavaş hissettirmesinin sebebi buydu. Bu liste mobilde `hidden`
            olduğu için görünürlük tabanlı prefetch telefonda tetiklenmez;
            telefonda veri harcanmaz. */}
        <nav className="hidden md:flex items-center gap-4 lg:gap-6">
          {NAV_HREFS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              prefetch
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t(l.key)}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-1 md:gap-2">
          {/* Locale switcher — masaüstü: tüm diller yan yana */}
          <div className="hidden md:flex items-center gap-0.5 rounded-full border border-border/60 bg-muted/60 p-0.5 ml-2">
            {LOCALES.map((l) => (
              <button
                key={l.code}
                onClick={() => switchLocale(l.code)}
                disabled={isPending}
                title={l.name}
                aria-label={l.name}
                aria-pressed={activeLocale === l.code}
                className={`flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 text-xs font-semibold transition-all ${
                  activeLocale === l.code
                    ? "bg-background text-foreground shadow-sm ring-1 ring-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                }`}
              >
                <FlagIcon code={l.code} className="h-5 w-5" />
                <span>{l.label}</span>
              </button>
            ))}
          </div>

          {/* Locale switcher — mobil: tek bayraklı açılır menü, üç çizgiye
              gerek kalmadan her zaman görünür. */}
          <div className="relative md:hidden">
            <button
              onClick={() => setLangOpen((v) => !v)}
              disabled={isPending}
              aria-label={t("language")}
              className="flex items-center gap-1 rounded-full border border-border/60 bg-muted/60 py-1 pl-1 pr-2 text-xs font-semibold text-foreground"
            >
              <FlagIcon code={currentLocaleMeta.code} className="h-5 w-5" />
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>
            {langOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                <div className="absolute right-0 top-full mt-2 z-50 min-w-[150px] rounded-xl border border-border bg-background p-1 shadow-lg">
                  {LOCALES.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => { switchLocale(l.code); setLangOpen(false); }}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                        activeLocale === l.code
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:bg-muted/60"
                      }`}
                    >
                      <FlagIcon code={l.code} className="h-5 w-5" />
                      <span>{l.name}</span>
                      {activeLocale === l.code && <span className="ml-auto text-xs text-primary">✓</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="hidden md:block">
            <ThemePicker />
          </div>

          {/* /auth/* [locale] segmentinin DIŞINDA (bkz. proxy.ts'teki
              LOCALE_ROUTING_EXCLUDED_PREFIXES) — kasıtlı olarak sıradan
              next/link, locale-aware Link DEĞİL; aksi halde /en/auth/giris
              gibi var olmayan bir yola giderdi. Mobilde de her zaman
              görünür (üç çizgiye basmaya gerek yok), sadece metin uzun
              çevirilerde (örn. Rusça) sarabilsin diye kompakt boyutlu. */}
          <NextLink href="/auth/giris">
            <Button
              variant="ghost"
              size="sm"
              className="whitespace-normal px-2 text-center text-xs leading-tight md:whitespace-nowrap md:px-3 md:text-[0.8rem]"
            >
              {t("login")}
            </Button>
          </NextLink>
          <NextLink href="/auth/kayit">
            <Button
              size="sm"
              className="max-w-[100px] whitespace-normal bg-primary px-2.5 text-center text-xs leading-tight shadow-sm hover:bg-primary/90 md:max-w-none md:whitespace-nowrap md:px-4 md:text-[0.8rem]"
            >
              {t("startFree")}
            </Button>
          </NextLink>

          {/* Mobile menu button — artık yalnızca sayfa bağlantıları (özellikler,
              fiyatlar, vb.) ve tema seçici için; giriş/kayıt/dil zaten yukarıda. */}
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
          {/* Bu bağlantılar yalnızca menü AÇIKKEN DOM'a giriyor; prefetch de
              ancak o an başlıyor. Yani telefonda veri, kullanıcı gezinme niyetini
              belli ettikten sonra harcanıyor — menüyü açıp bir sekmeye dokunan
              kullanıcı için sayfa çoğunlukla hazır oluyor. */}
          {NAV_HREFS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              prefetch
              className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              {t(l.key)}
            </Link>
          ))}
          <div className="pt-2 border-t border-border/60 flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">SiriPlan</span>
            <ThemePicker />
          </div>
        </div>
      )}
    </header>
  );
}
