"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { NextIntlClientProvider, useTranslations, type AbstractIntlMessages } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Phone } from "lucide-react";
import { tr, enUS, ru, ar, type Locale as DateFnsLocale } from "date-fns/locale";
import type { Service, Staff, Organization, ServiceCategory } from "@/types/database";
import { isSupportedLanguage, type LanguageCode } from "@/lib/languages";
import { websiteThemeStyle } from "@/lib/website-palettes";
import { resolveWebsiteLayout } from "@/lib/website-layouts";
import { getEntitlements } from "@/lib/entitlements";
import { getSubscriptionLock } from "@/lib/subscription-lock";
import type { SalonData } from "./booking-shared";
import { ClassicLayout } from "./ClassicLayout";
import { ShowcaseLayout } from "./ShowcaseLayout";
import { PoweredByBadge } from "@/components/public/PoweredByBadge";

import trMessages from "../../../../messages/tr.json";
import enMessages from "../../../../messages/en.json";
import ruMessages from "../../../../messages/ru.json";
import arMessages from "../../../../messages/ar.json";

const MESSAGES: Record<LanguageCode, AbstractIntlMessages> = {
  tr: trMessages as unknown as AbstractIntlMessages,
  en: enMessages as unknown as AbstractIntlMessages,
  ru: ruMessages as unknown as AbstractIntlMessages,
  ar: arMessages as unknown as AbstractIntlMessages,
};

const DATE_FNS_LOCALES: Record<LanguageCode, DateFnsLocale> = { tr, en: enUS, ru, ar };

export function PublicBookingClient({ slug }: { slug: string }) {
  // Varsayılan dil salonun kendi tercihine göre değişir (org.locale), müşteri
  // telefonunu girdiğinde daha önce kaydettiği dil biliniyorsa ona geçilir.
  // Elle seçilen bayrak butonu her zaman önceliklidir.
  const [lang, setLang] = useState<LanguageCode>("tr");

  return (
    <NextIntlClientProvider locale={lang} messages={MESSAGES[lang]}>
      <PublicBookingPage slug={slug} lang={lang} setLang={setLang} />
    </NextIntlClientProvider>
  );
}

function PublicBookingPage({
  slug, lang, setLang,
}: {
  slug: string;
  lang: LanguageCode;
  setLang: (l: LanguageCode) => void;
}) {
  const t = useTranslations("booking.public");
  const manualLangOverride = useRef(false);

  const [org, setOrg] = useState<Organization | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [staffServiceMap, setStaffServiceMap] = useState<Record<string, string[]>>({});
  // "kayitli ad -> 4 dildeki karsiligi" sozlugu; /api/public/salon yalnizca
  // katalogda karsiligi bulunan adlari gonderir (bkz. buildNameI18nMap).
  const [nameI18n, setNameI18n] = useState<Record<string, Partial<Record<LanguageCode, string>>>>({});

  // Salon verisi Supabase'den DOĞRUDAN çekilmez.
  //
  // Önceden burada `organizations.select("*")` vardı; organizations tablosunda
  // wa_token / ig_page_access_token / sms_password / stripe_customer_id gibi
  // entegrasyon sırları duruyor ve bunlar her randevu sayfası ziyaretinde
  // tarayıcıya iniyordu (aynı şekilde staff tablosundan personel telefonu,
  // e-postası, prim oranı). /api/public/salon sunucu tarafında çalışır ve
  // yalnızca beyaz listedeki güvenli kolonları döndürür.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/public/salon?slug=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.org) return;
        const orgData = data.org as Organization;
        setOrg(orgData);
        setServices(
          ((data.services as Service[]) || []).filter((s) => s.is_active && s.is_bookable_online !== false)
        );
        const activeStaff = ((data.staff as Staff[]) || []).filter((s) => s.is_active);
        setStaff(activeStaff);
        const map: Record<string, string[]> = {};
        for (const row of (data.staff_services as { staff_id: string; service_id: string }[]) || []) {
          (map[row.service_id] ??= []).push(row.staff_id);
        }
        setStaffServiceMap(map);
        setNameI18n((data.name_i18n as Record<string, Partial<Record<LanguageCode, string>>>) || {});
        setCategories(
          [...((data.categories as ServiceCategory[]) || [])].sort((a, b) => a.display_order - b.display_order)
        );
        if (!manualLangOverride.current) {
          const stored = typeof window !== "undefined" ? window.localStorage.getItem(`lang_${slug}`) : null;
          if (stored && isSupportedLanguage(stored)) {
            setLang(stored as LanguageCode);
          } else if (isSupportedLanguage(orgData.locale)) {
            setLang(orgData.locale);
          }
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [slug, setLang]);

  /**
   * Hizmet/kategori adını ziyaretçinin seçtiği dile çevirir — SADECE GÖSTERİM.
   *
   * Adlar veritabanına salonun kayıt olduğu dilde yazılır; ziyaretçi başka bir
   * dil seçtiğinde katalog karşılığı varsa o dilde gösterilir. Salonun kendi
   * yazdığı/düzenlediği adlar sözlükte bulunmaz ve olduğu gibi gösterilir.
   *
   * Randevu her yerde service_id ile kurulur — bu çeviri gönderilen veriyi,
   * bildirimleri veya hatırlatmaları etkilemez.
   */
  const localizeName = useCallback(
    (name?: string | null): string => (name ? nameI18n[name]?.[lang] ?? name : ""),
    [nameI18n, lang]
  );

  const onLangChange = useCallback((l: LanguageCode) => {
    manualLangOverride.current = true;
    setLang(l);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(`lang_${slug}`, l);
    }
  }, [setLang, slug]);

  const onDetectedLanguage = useCallback((l: LanguageCode) => {
    if (manualLangOverride.current) return;
    setLang(l);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(`lang_${slug}`, l);
    }
  }, [setLang, slug]);

  if (!org) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[oklch(0.985_0.006_70)] dark:bg-[oklch(0.15_0.03_290)]">
        <div className="absolute -top-32 -left-24 w-96 h-96 rounded-full bg-rose-300/25 dark:bg-fuchsia-800/20 blur-3xl animate-soft-float" />
        <div className="absolute -bottom-32 -right-24 w-96 h-96 rounded-full bg-amber-200/30 dark:bg-purple-900/20 blur-3xl animate-soft-float" style={{ animationDelay: "-4s" }} />
        <div className="relative flex flex-col items-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium tracking-wide">{t("loadingPage")}</p>
        </div>
      </div>
    );
  }

  // Abonelik/deneme süresi dolmuş işletmeler online randevu alamaz (bkz.
  // getSubscriptionLock — /api/appointments zaten bunu 403 ile reddediyor).
  // Müşteriyi tüm sihirbazı doldurup sonda hataya çarpmak yerine, en baştan
  // sadece işletmenin telefon numarasını göster.
  const subscriptionLock = getSubscriptionLock(org);
  if (subscriptionLock.locked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-br from-rose-50 via-background to-amber-50 dark:from-zinc-950 dark:via-background dark:to-purple-950/30 p-4">
        <Card className="relative max-w-md w-full text-center border-0 shadow-2xl shadow-primary/10 overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-primary via-accent to-primary" />
          <CardContent className="p-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Phone className="h-7 w-7 text-primary" />
            </div>
            <h2 className="font-heading text-xl font-bold mb-2">{org.name}</h2>
            <p className="font-heading text-lg font-semibold mb-2">{t("bookingClosedTitle")}</p>
            <p className="text-muted-foreground text-sm mb-5">{t("bookingClosedMessage")}</p>
            {org.phone ? (
              <a
                href={`tel:${org.phone}`}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-primary-foreground shadow-lg shadow-primary/25"
                style={{ background: "linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--accent) 55%, var(--primary)))" }}
              >
                <Phone className="h-4 w-4" /> {org.phone}
              </a>
            ) : null}
          </CardContent>
        </Card>
        <PoweredByBadge />
      </div>
    );
  }

  // Deneme süresi Pro'ya denk: website modu etkin yetkiden hesaplanır.
  const websiteMode = !!(getEntitlements(org).feature_website && org.website_enabled);
  // Vitrin şablonu bir website modu özelliğidir; mod kapalıyken sayfa her zaman
  // yalın randevu formudur (klasik), yoksa Starter plan Pro görünüm alırdı.
  const layout = websiteMode ? resolveWebsiteLayout(org.website_layout) : "classic";
  const dateLocale = DATE_FNS_LOCALES[lang];

  const salon: SalonData = { org, services, categories, staff, staffServiceMap, localizeName, lang };
  const isRtl = lang === "ar";

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="min-h-screen relative bg-gradient-to-br from-rose-50 via-background to-amber-50 dark:from-zinc-950 dark:via-background dark:to-purple-950/30"
      style={websiteMode ? websiteThemeStyle(org.website_palette) : undefined}
    >
      {/* Ambient decorative glow — pure atmosphere, no interaction */}
      <div className="pointer-events-none fixed -top-40 -right-32 w-[520px] h-[520px] rounded-full bg-primary/10 dark:bg-primary/15 blur-3xl" />
      <div className="pointer-events-none fixed top-1/3 -left-40 w-96 h-96 rounded-full bg-amber-200/25 dark:bg-purple-900/15 blur-3xl" />

      {layout === "showcase" ? (
        <ShowcaseLayout
          salon={salon}
          dateLocale={dateLocale}
          lang={lang}
          onLangChange={onLangChange}
          onDetectedLanguage={onDetectedLanguage}
        />
      ) : (
        <ClassicLayout
          salon={salon}
          dateLocale={dateLocale}
          lang={lang}
          onLangChange={onLangChange}
          onDetectedLanguage={onDetectedLanguage}
          websiteMode={websiteMode}
        />
      )}

      <PoweredByBadge />
    </div>
  );
}
