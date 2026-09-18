"use client";

import NextLink from "next/link";
import { useState, useTransition } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemePicker } from "@/components/layout/ThemePicker";
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
  { code: "tr", label: "TR", flag: "🇹🇷" },
  { code: "en", label: "EN", flag: "🇬🇧" },
  { code: "ru", label: "RU", flag: "🇷🇺" },
  { code: "ar", label: "AR", flag: "🇸🇦" },
] as const;

export function Navbar() {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const activeLocale = useLocale();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();

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
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <img
            src="/icons/icon-mark.png"
            alt="SiriPlan"
            className="w-8 h-8 rounded-lg shadow-sm"
          />
          <span className="font-bold text-lg tracking-tight">
            Siri<span className="text-primary">Plan</span>
          </span>
          <span className="hidden md:inline text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
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
        <nav className="hidden md:flex items-center gap-6">
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

          {/* /auth/* [locale] segmentinin DIŞINDA (bkz. proxy.ts'teki
              LOCALE_ROUTING_EXCLUDED_PREFIXES) — kasıtlı olarak sıradan
              next/link, locale-aware Link DEĞİL; aksi halde /en/auth/giris
              gibi var olmayan bir yola giderdi. */}
          <NextLink href="/auth/giris" className="hidden md:block">
            <Button variant="ghost" size="sm">
              {t("login")}
            </Button>
          </NextLink>
          <NextLink href="/auth/kayit" className="hidden md:block">
            <Button size="sm" className="bg-primary hover:bg-primary/90 shadow-sm">
              {t("startFree")}
            </Button>
          </NextLink>

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
            <NextLink href="/auth/giris" className="flex-1">
              <Button variant="outline" size="sm" className="w-full">
                {t("login")}
              </Button>
            </NextLink>
            <NextLink href="/auth/kayit" className="flex-1">
              <Button size="sm" className="w-full bg-primary hover:bg-primary/90">
                {t("startFree")}
              </Button>
            </NextLink>
          </div>
        </div>
      )}
    </header>
  );
}
