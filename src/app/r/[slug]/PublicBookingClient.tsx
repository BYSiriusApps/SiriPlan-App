"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { NextIntlClientProvider, useTranslations, type AbstractIntlMessages } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, ChevronRight, ChevronLeft, Calendar, Clock, Phone } from "lucide-react";
import { toast } from "sonner";
import { format, addDays, type Locale as DateFnsLocale } from "date-fns";
import { tr, enUS, ru, ar } from "date-fns/locale";
import type { Service, Staff, Organization, ServiceCategory } from "@/types/database";
import { renderKvkkNotice } from "@/lib/kvkk";
import { SUPPORTED_LANGUAGES, isSupportedLanguage, type LanguageCode } from "@/lib/languages";
import { websiteThemeStyle } from "@/lib/website-palettes";
import { getEntitlements } from "@/lib/entitlements";
import { getSubscriptionLock } from "@/lib/subscription-lock";
import { resolveEligibleStaffIds } from "@/lib/staff-eligibility";
import { zonedWallTimeToUtc, DEFAULT_ORG_TIMEZONE } from "@/lib/istanbul-time";
import { HONEYPOT_FIELD } from "@/lib/bot-guard";
import { MapPin, Star as StarIcon, Instagram } from "lucide-react";

// lucide-react'ta marka ikonu olarak TikTok bulunmuyor (Instagram/Facebook gibi
// birkaç istisna dışında marka logoları desteklenmiyor) — resmi TikTok notu
// buraya inline SVG olarak eklendi, ek bir paket bağımlılığı gerekmesin diye.
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M16.6 5.82c-.9-.86-1.42-2.05-1.42-3.37h-3.03v13.6c0 1.55-1.26 2.8-2.8 2.8a2.8 2.8 0 0 1-2.8-2.8 2.8 2.8 0 0 1 2.8-2.8c.26 0 .5.03.74.1V10.3a5.8 5.8 0 0 0-.74-.05A5.83 5.83 0 0 0 3.55 16.08 5.83 5.83 0 0 0 9.38 21.9a5.83 5.83 0 0 0 5.83-5.82V9.01a8.36 8.36 0 0 0 4.88 1.56V7.55c-1.24 0-2.39-.4-3.33-1.08-.06-.04-.11-.09-.16-.13Z" />
    </svg>
  );
}

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

function ServiceButton({
  service, index, onSelect, label,
}: {
  service: Service;
  index: number;
  onSelect: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onSelect}
      className="animate-fade-up w-full text-left p-4 rounded-2xl border border-border bg-card/70 backdrop-blur-sm transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 group relative overflow-hidden"
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary/0 group-hover:bg-primary transition-colors" />
      <div className="flex items-center gap-3">
        {service.photo_url && (
          <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 relative">
            <img src={service.photo_url} alt={service.name} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold group-hover:text-primary transition-colors truncate">{service.name}</p>
            {service.description && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{service.description}</p>}
            <div className="flex items-center gap-1.5 mt-1.5">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{service.duration_minutes} {label}</span>
            </div>
          </div>
          <div className="text-right shrink-0 flex items-center gap-1">
            <p className="font-heading text-lg font-bold text-primary tabular-nums">₺{Number(service.price).toLocaleString("tr-TR")}</p>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      </div>
    </button>
  );
}

export function PublicBookingClient({ slug }: { slug: string }) {
  // Varsayılan dil salonun kendi tercihine göre değişir (org.locale), müşteri
  // telefonunu girdiğinde daha önce kaydettiği dil biliniyorsa ona geçilir —
  // bkz. BookingWizard içindeki lookup effect'i. Elle seçilen bayrak butonu
  // her zaman önceliklidir.
  const [lang, setLang] = useState<LanguageCode>("tr");

  return (
    <NextIntlClientProvider locale={lang} messages={MESSAGES[lang]}>
      <BookingWizard slug={slug} lang={lang} setLang={setLang} />
    </NextIntlClientProvider>
  );
}

function BookingWizard({
  slug,
  lang,
  setLang,
}: {
  slug: string;
  lang: LanguageCode;
  setLang: (l: LanguageCode) => void;
}) {
  const t = useTranslations("booking.public");
  const dateLocale = DATE_FNS_LOCALES[lang];
  const manualLangOverride = useRef(false);

  const STEPS = [t("stepService"), t("stepStaffTime"), t("stepYourInfo")];

  const [step, setStep] = useState(0);
  const [org, setOrg] = useState<Organization | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [staffServiceMap, setStaffServiceMap] = useState<Record<string, string[]>>({});
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [anyStaff, setAnyStaff] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [form, setForm] = useState({
    name: "", phone: "", email: "", note: "",
    // Honeypot — ekranda görünmez, sadece botlar doldurur (bkz. lib/bot-guard.ts).
    website: "",
  });
  // Formun ekrana geldiği an; sunucu tarafı "insan bu formu 2.5 saniyeden
  // kısa sürede dolduramaz" kontrolü için kullanır.
  const formStartedAt = useRef<number>(Date.now());
  const [kvkkAccepted, setKvkkAccepted] = useState(false);
  const [marketingAccepted, setMarketingAccepted] = useState(false);
  const [showKvkkText, setShowKvkkText] = useState(false);

  // Salon verisi artık Supabase'den DOĞRUDAN çekilmiyor.
  //
  // Önceden burada `organizations.select("*")` vardı; organizations tablosunda
  // wa_token / ig_page_access_token / sms_password / stripe_customer_id gibi
  // entegrasyon sırları duruyor ve bunlar her randevu sayfası ziyaretinde
  // tarayıcıya iniyordu (aynı şekilde staff tablosundan personel telefonu,
  // e-postası, prim oranı). /api/public/salon sunucu tarafında çalışır ve
  // yalnızca beyaz listedeki güvenli kolonları döndürür.
  //
  // Kategoriler de aynı yanıtın içinde gelir; tablo henüz Supabase'e
  // uygulanmamışsa sunucu tarafında sessizce boş listeye düşer, ana randevu
  // akışı (org/services/staff) bundan etkilenmez.
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
        setCategories(
          [...((data.categories as ServiceCategory[]) || [])].sort((a, b) => a.display_order - b.display_order)
        );
        if (!manualLangOverride.current && isSupportedLanguage(orgData.locale)) {
          setLang(orgData.locale);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [slug, setLang]);

  // Seçilen hizmete atanmış personel varsa (staff_services), sadece onları göster —
  // aksi halde (kısıtlama yoksa) tüm aktif personel aday kabul edilir. Bu, backend'in
  // findAvailableStaff fallback mantığıyla (bkz. staff-availability.ts) birebir aynı
  // olmalı; aksi halde "Farketmez" seçiminde UI'da müsait görünen bir saat backend'de
  // "Seçilen saatte uygun personel yok" hatası verebilir.
  // useMemo şart: bu değer olmadan her render'da yeni bir dizi referansı
  // üretilir, aşağıdaki "saat müsaitliği" effect'i buna bağımlı olduğundan
  // (satır ~221) her render'ı yeniden tetikler → sonsuz döngü → saat seçimi
  // ekranda sürekli "yükleniyor" spinner'ında donup asla açılmaz.
  const eligibleStaff = useMemo(() => {
    if (!selectedService) return staff;
    const assignedIds = staffServiceMap[selectedService.id] ?? [];
    const eligibleIds = new Set(resolveEligibleStaffIds(staff.map((s) => s.id), assignedIds));
    return staff.filter((s) => eligibleIds.has(s.id));
  }, [staff, staffServiceMap, selectedService]);

  // Dönen müşteri tespiti: telefon numarası yeterince uzunsa (10+ hane),
  // daha önce kaydettiği dil tercihi varsa sayfayı o dile geçirir.
  useEffect(() => {
    const digits = form.phone.replace(/\D/g, "");
    if (digits.length < 10 || !org) return;
    const timeout = setTimeout(() => {
      fetch(`/api/public/customer-language?slug=${org.slug}&phone=${encodeURIComponent(form.phone)}`)
        .then((r) => r.json())
        .then((d) => {
          if (!manualLangOverride.current && d.preferred_language && isSupportedLanguage(d.preferred_language)) {
            setLang(d.preferred_language);
          }
        })
        .catch(() => {});
    }, 500);
    return () => clearTimeout(timeout);
  }, [form.phone, org, setLang]);

  // Load available slots when date/staff/service changes — "Farketmez" seçiliyse
  // tüm personelin müsaitliğini birleştirip (union) tek bir saat listesi gösterir.
  useEffect(() => {
    if ((!selectedStaff && !anyStaff) || !selectedService || !selectedDate || !org) return;
    setLoadingSlots(true);
    const candidateStaff = anyStaff ? eligibleStaff : selectedStaff ? [selectedStaff] : [];
    Promise.all(
      candidateStaff.map((s) =>
        fetch(`/api/availability?slug=${org.slug}&staff_id=${s.id}&service_id=${selectedService.id}&date=${selectedDate}`)
          .then((r) => r.json())
          .then((d) => (d.slots as string[] | undefined) || [])
          .catch(() => [])
      )
    )
      .then((lists) => {
        const merged = Array.from(new Set(lists.flat())).sort();
        setSlots(merged);
      })
      .finally(() => setLoadingSlots(false));
  }, [selectedStaff, anyStaff, eligibleStaff, selectedService, selectedDate, org]);

  async function handleSubmit() {
    if (!org || !selectedService || (!selectedStaff && !anyStaff) || !selectedDate || !selectedSlot || !kvkkAccepted) return;
    setSubmitting(true);
    try {
      // Saat dilimi: müsait saatler /api/availability tarafından SALONUN saat
      // diliminde üretiliyor. `new Date("...T14:30:00")` ise metni ZİYARETÇİNİN
      // saat diliminde yorumlar — yurt dışından (veya saati yanlış kurulmuş bir
      // telefondan) randevu alan müşteride ekranda seçilen saat ile kaydedilen
      // saat birbirini tutmuyordu. Dönüşüm her zaman salonun saat dilimine göre.
      const appointmentAt = zonedWallTimeToUtc(
        selectedDate,
        selectedSlot,
        org.timezone || DEFAULT_ORG_TIMEZONE
      ).toISOString();
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: org.id,
          customer_name: form.name,
          customer_phone: form.phone,
          customer_email: form.email || undefined,
          ...(anyStaff ? { auto_assign_staff: true } : { staff_id: selectedStaff!.id }),
          service_id: selectedService.id,
          appointment_at: appointmentAt,
          note: form.note || undefined,
          source: "web",
          kvkk_consent: kvkkAccepted,
          marketing_consent: marketingAccepted,
          kvkk_notice_snapshot: renderKvkkNotice(org.kvkk_notice_text, org.name),
          preferred_language: lang,
          // Bot savunması (bkz. lib/bot-guard.ts): görünmez alan + form açılış
          // damgası. Gerçek kullanıcı için ikisi de tamamen görünmez.
          website: form.website,
          form_started_at: formStartedAt.current,
        }),
      });
      if (res.ok) {
        setDone(true);
      } else {
        const err = await res.json().catch(() => null);
        toast.error(err?.error || t("genericError"));
      }
    } catch {
      toast.error(t("genericError"));
    } finally {
      setSubmitting(false);
    }
  }

  // Next 14 days for date picker
  const dateOptions = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(new Date(), i);
    return {
      value: format(d, "yyyy-MM-dd"),
      label: format(d, "d MMM, EEE", { locale: dateLocale }),
    };
  });

  function LanguageSwitcher() {
    return (
      <div className="flex items-center gap-1 shrink-0">
        {SUPPORTED_LANGUAGES.map((l) => (
          <button
            key={l.code}
            type="button"
            title={l.name}
            onClick={() => { manualLangOverride.current = true; setLang(l.code); }}
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
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-rose-50 via-background to-amber-50 dark:from-zinc-950 dark:via-background dark:to-purple-950/30 p-4">
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
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-rose-50 via-background to-amber-50 dark:from-zinc-950 dark:via-background dark:to-purple-950/30 p-4">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[560px] h-[560px] rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <Card className="relative max-w-md w-full text-center border-0 shadow-2xl shadow-primary/10 animate-fade-up overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-primary via-accent to-primary" />
          <CardContent className="p-8">
            <div className="relative w-20 h-20 mx-auto mb-5">
              <div className="absolute inset-0 rounded-full bg-emerald-100 dark:bg-emerald-900/30 animate-pulse" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="h-9 w-9 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/70 mb-1">{t("confirmedBadge")}</p>
            <h2 className="font-heading text-3xl font-bold mb-2 text-balance">{t("successTitle")}</h2>
            <p className="text-muted-foreground mb-6 text-sm">
              {t("successMessage", { service: selectedService?.name ?? "" })}
            </p>
            <div className="rounded-2xl border border-border/70 bg-muted/30 p-4 text-sm space-y-2.5 text-left mb-6">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">{t("summarySalon")}</span>
                <span className="font-medium text-right">{org.name}</span>
              </div>
              <div className="h-px bg-border/60" />
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{t("summaryDate")}</span>
                <span className="font-medium text-right capitalize">{selectedDate && format(new Date(selectedDate + "T12:00:00"), "d MMMM yyyy, EEEE", { locale: dateLocale })}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{t("summaryTime")}</span>
                <span className="font-bold text-primary text-right">{selectedSlot}</span>
              </div>
              <div className="h-px bg-border/60" />
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">{t("summaryStaff")}</span>
                <span className="font-medium text-right">{anyStaff ? t("autoAssignLabel") : selectedStaff?.full_name}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">{t("summaryService")}</span>
                <span className="font-medium text-right">{selectedService?.name}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {t("waReminderNote")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Deneme süresi Pro'ya denk: website modu etkin yetkiden hesaplanır.
  const websiteMode = !!(getEntitlements(org).feature_website && org.website_enabled);
  const categorizedGroups = categories
    .map((cat) => ({
      category: cat,
      items: services.filter((s) => s.category_id === cat.id),
    }))
    .filter((g) => g.items.length > 0);
  const uncategorizedServices = services.filter((s) => !s.category_id);

  return (
    <div
      className="min-h-screen relative bg-gradient-to-br from-rose-50 via-background to-amber-50 dark:from-zinc-950 dark:via-background dark:to-purple-950/30"
      style={websiteMode ? websiteThemeStyle(org.website_palette) : undefined}
    >
      {/* Ambient decorative glow — pure atmosphere, no interaction */}
      <div className="pointer-events-none fixed -top-40 -right-32 w-[520px] h-[520px] rounded-full bg-primary/10 dark:bg-primary/15 blur-3xl" />
      <div className="pointer-events-none fixed top-1/3 -left-40 w-96 h-96 rounded-full bg-amber-200/25 dark:bg-purple-900/15 blur-3xl" />

      {/* Website Modu: kapak fotoğrafı + tanıtım yazısı + adres/yorum kısayolları */}
      {websiteMode && (org.cover_url || org.website_tagline || org.location_url || org.google_review_url || org.instagram_handle || org.tiktok_handle) && (
        <div className="relative bg-[var(--w-background)] text-[var(--w-foreground)]">
          {org.cover_url && (
            <div className="relative h-40 sm:h-56 w-full overflow-hidden">
              <img src={org.cover_url} alt={org.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
            </div>
          )}
          <div className="max-w-xl mx-auto px-4 py-4 space-y-3">
            {org.website_tagline && (
              <p className="text-sm leading-relaxed opacity-90">{org.website_tagline}</p>
            )}
            {(org.location_url || org.google_review_url || org.instagram_handle || org.tiktok_handle) && (
              <div className="flex flex-wrap items-center gap-2">
                {org.location_url && (
                  <a
                    href={org.location_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--w-primary)] text-[var(--w-primary-foreground)] hover:opacity-90 transition-opacity"
                  >
                    <MapPin className="h-3.5 w-3.5" /> Yol Tarifi Al
                  </a>
                )}
                {org.google_review_url && (
                  <a
                    href={org.google_review_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-current opacity-90 hover:opacity-100 transition-opacity"
                  >
                    <StarIcon className="h-3.5 w-3.5" /> Değerlendirmeler
                  </a>
                )}
                {org.instagram_handle && (
                  <a
                    href={`https://instagram.com/${org.instagram_handle.replace(/^@/, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-current opacity-90 hover:opacity-100 transition-opacity shrink-0"
                  >
                    <Instagram className="h-3.5 w-3.5" />
                  </a>
                )}
                {org.tiktok_handle && (
                  <a
                    href={`https://www.tiktok.com/@${org.tiktok_handle.replace(/^@/, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="TikTok"
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-current opacity-90 hover:opacity-100 transition-opacity shrink-0"
                  >
                    <TikTokIcon className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Salon header */}
      <div className="relative bg-card/90 backdrop-blur-sm border-b border-border/70">
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
            <h1 className="font-heading font-bold text-xl leading-tight truncate">{org.name}</h1>
            {org.city && <p className="text-sm text-muted-foreground">{org.city}</p>}
          </div>
          <LanguageSwitcher />
        </div>
      </div>

      <div className="relative max-w-xl mx-auto p-4 py-8">
        {/* Step indicator */}
        <div className="flex items-center justify-between mb-9">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  i < step ? "bg-primary text-primary-foreground" :
                  i === step ? "text-primary-foreground shadow-lg shadow-primary/35 scale-110" :
                  "bg-muted text-muted-foreground"
                }`}
                style={i === step ? { background: "linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--accent) 55%, var(--primary)))" } : undefined}
                >
                  {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`text-[10px] font-medium hidden sm:block text-center leading-tight ${i === step ? "text-primary font-semibold" : "text-muted-foreground"}`}>{s}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-0.5 mx-2 rounded-full bg-muted overflow-hidden -mt-4 sm:mt-0">
                  <div className={`h-full bg-primary transition-all duration-500 ${i < step ? "w-full" : "w-0"}`} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Step 0: Service selection */}
        {step === 0 && (
          <div className="space-y-2.5">
            <div className="mb-5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/70">{t("step1Label")}</span>
              <h2 className="font-heading text-2xl font-bold">{t("chooseServiceTitle")}</h2>
            </div>
            {services.length === 0 && (
              <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-border bg-card/50">
                <p className="text-sm text-muted-foreground">
                  {t("noServicesAvailable")}
                </p>
                {org.phone && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {t("callToBook")}{" "}
                    <a href={`tel:${org.phone}`} className="text-primary font-medium hover:underline">{org.phone}</a>
                  </p>
                )}
              </div>
            )}
            {websiteMode && categorizedGroups.length > 0 ? (
              <div className="space-y-6">
                {categorizedGroups.map(({ category, items }) => (
                  <div key={category.id}>
                    <div className="flex items-center gap-2.5 mb-2.5">
                      {category.photo_url ? (
                        <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 relative">
                          <img src={category.photo_url} alt={category.name} className="w-full h-full object-cover" />
                        </div>
                      ) : null}
                      <h3 className="font-heading font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                        {category.name}
                      </h3>
                    </div>
                    {category.service_category_photos && category.service_category_photos.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-2 mb-2.5 -mx-1 px-1">
                        {[...category.service_category_photos]
                          .sort((a, b) => a.display_order - b.display_order)
                          .map((p) => (
                            <div key={p.id} className="w-20 h-20 rounded-xl overflow-hidden shrink-0 relative">
                              <img src={p.url} alt={category.name} className="w-full h-full object-cover" />
                            </div>
                          ))}
                      </div>
                    )}
                    <div className="space-y-2.5">
                      {items.map((s, i) => (
                        <ServiceButton key={s.id} service={s} index={i} onSelect={() => { setSelectedService(s); setStep(1); }} label={t("minutesShort")} />
                      ))}
                    </div>
                  </div>
                ))}
                {uncategorizedServices.length > 0 && (
                  <div>
                    <h3 className="font-heading font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2.5">
                      Diğer Hizmetler
                    </h3>
                    <div className="space-y-2.5">
                      {uncategorizedServices.map((s, i) => (
                        <ServiceButton key={s.id} service={s} index={i} onSelect={() => { setSelectedService(s); setStep(1); }} label={t("minutesShort")} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              services.map((s, i) => (
                <ServiceButton key={s.id} service={s} index={i} onSelect={() => { setSelectedService(s); setStep(1); }} label={t("minutesShort")} />
              ))
            )}
          </div>
        )}

        {/* Step 1: Staff + Date + Slot */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-up">
            <div className="flex items-center gap-3 mb-1">
              <button onClick={() => setStep(0)} className="p-1.5 hover:bg-accent rounded-lg transition-colors shrink-0">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/70">{t("step2Label")}</span>
                <h2 className="font-heading text-2xl font-bold leading-tight">{t("stepStaffTime")}</h2>
              </div>
            </div>

            {selectedService && (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-primary/5 border border-primary/20">
                <Badge variant="secondary" className="font-heading">{selectedService.name}</Badge>
                <span className="text-sm text-muted-foreground tabular-nums">₺{Number(selectedService.price).toLocaleString("tr-TR")} • {selectedService.duration_minutes}{t("minutesShort")}</span>
              </div>
            )}

            {/* Staff selection */}
            <div>
              <p className="text-sm font-semibold mb-2.5">{t("chooseStaffTitle")}</p>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => { setAnyStaff(true); setSelectedStaff(null); setSelectedSlot(""); }}
                  className={`p-3 rounded-2xl border-2 text-left transition-all ${
                    anyStaff ? "border-primary bg-primary/5 shadow-sm shadow-primary/10" : "border-border bg-card/60 hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center font-semibold text-primary text-sm shrink-0">
                      ?
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{t("anyStaffLabel")}</p>
                      <p className="text-xs text-muted-foreground truncate">{t("anyStaffDesc")}</p>
                    </div>
                  </div>
                </button>
                {eligibleStaff.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setAnyStaff(false); setSelectedStaff(s); setSelectedSlot(""); }}
                    className={`p-3 rounded-2xl border-2 text-left transition-all ${
                      !anyStaff && selectedStaff?.id === s.id ? "border-primary bg-primary/5 shadow-sm shadow-primary/10" : "border-border bg-card/60 hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/25 to-accent/40 flex items-center justify-center font-heading font-semibold text-primary text-sm shrink-0">
                        {s.full_name[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{s.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{s.role}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Date selection */}
            {(selectedStaff || anyStaff) && (
              <div>
                <p className="text-sm font-semibold mb-2.5">{t("chooseDateTitle")}</p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {dateOptions.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => { setSelectedDate(d.value); setSelectedSlot(""); }}
                      className={`flex-shrink-0 px-3.5 py-2.5 rounded-2xl border-2 text-center transition-all ${
                        selectedDate === d.value ? "border-primary text-primary-foreground shadow-md shadow-primary/25" : "border-border bg-card/60 hover:border-primary/50"
                      }`}
                      style={selectedDate === d.value ? { background: "linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--accent) 55%, var(--primary)))" } : undefined}
                    >
                      <p className="text-xs font-semibold whitespace-nowrap">{d.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Time slots */}
            {selectedDate && (selectedStaff || anyStaff) && (
              <div>
                <p className="text-sm font-medium mb-2">{t("chooseTimeTitle")}</p>
                {loadingSlots ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">{t("loadingSlots")}</span>
                  </div>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-3">{t("noSlotsAvailable")}</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {slots.map((slot) => (
                      <button
                        key={slot}
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-2.5 rounded-xl border-2 text-sm font-semibold tabular-nums transition-all ${
                          selectedSlot === slot ? "border-primary text-primary-foreground shadow-md shadow-primary/25 scale-[1.03]" : "border-border bg-card/60 hover:border-primary/50"
                        }`}
                        style={selectedSlot === slot ? { background: "linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--accent) 55%, var(--primary)))" } : undefined}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedSlot && (
              <Button
                className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20 gap-1.5 animate-fade-up"
                onClick={() => setStep(2)}
              >
                {t("continueButton")} <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {/* Step 2: Contact info */}
        {step === 2 && (
          <div className="space-y-5 animate-fade-up">
            <div className="flex items-center gap-3 mb-1">
              <button onClick={() => setStep(1)} className="p-1.5 hover:bg-accent rounded-lg transition-colors shrink-0">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/70">{t("step3Label")}</span>
                <h2 className="font-heading text-2xl font-bold leading-tight">{t("enterInfoTitle")}</h2>
              </div>
            </div>

            {/* Summary */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/8 to-accent/10 border border-primary/15 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="capitalize">{selectedDate && format(new Date(selectedDate + "T12:00:00"), "d MMMM yyyy, EEEE", { locale: dateLocale })}</span>
                <Clock className="h-4 w-4 ml-2" />
                <span className="font-semibold text-foreground tabular-nums">{selectedSlot}</span>
              </div>
              <p><span className="text-muted-foreground">{t("serviceLabel")}</span> <span className="font-medium">{selectedService?.name}</span></p>
              <p><span className="text-muted-foreground">{t("staffLabel")}</span> <span className="font-medium">{anyStaff ? t("autoAssignLabel") : selectedStaff?.full_name}</span></p>
              <p className="font-heading font-bold text-primary text-lg pt-1">₺{Number(selectedService?.price || 0).toLocaleString("tr-TR")}</p>
            </div>

            <div className="space-y-3.5">
              {/*
                Honeypot: ekran okuyuculardan ve klavye sırasından tamamen çıkarılmış,
                görsel olarak yok. Gerçek kullanıcı asla dolduramaz; "tüm input'ları
                doldur" mantığıyla çalışan spam botları neredeyse her zaman doldurur.
                Sunucu tarafı bu alan doluysa isteği sessizce reddeder.
              */}
              <input
                type="text"
                name={HONEYPOT_FIELD}
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
              />
              <div>
                <Label>{t("nameLabel")}</Label>
                <Input
                  placeholder={t("nameLabel")}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1.5 h-11 rounded-xl"
                />
              </div>
              <div>
                <Label>{t("phoneLabel")}</Label>
                <Input
                  type="tel"
                  placeholder="5xx xxx xx xx"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="mt-1.5 h-11 rounded-xl"
                />
              </div>
              <div>
                <Label>{t("emailLabel")}</Label>
                <Input
                  type="email"
                  placeholder="ornek@mail.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="mt-1.5 h-11 rounded-xl"
                />
              </div>
              <div>
                <Label>{t("noteLabel")}</Label>
                <Input
                  placeholder={t("noteLabel")}
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  className="mt-1.5 h-11 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2.5 p-3.5 rounded-2xl bg-muted/40 border border-border/60">
              <label className="flex items-start gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-primary"
                  checked={kvkkAccepted}
                  onChange={(e) => setKvkkAccepted(e.target.checked)}
                />
                <span>
                  {t("kvkkPrefix")}
                  <button type="button" className="text-primary underline underline-offset-2" onClick={(e) => { e.preventDefault(); setShowKvkkText((v) => !v); }}>
                    {t("kvkkLinkText")}
                  </button>
                  {t("kvkkSuffix")}
                </span>
              </label>
              {showKvkkText && (
                <p className="text-[11px] text-muted-foreground border-t border-border/60 pt-2">
                  {renderKvkkNotice(org.kvkk_notice_text, org.name)}
                </p>
              )}
              <label className="flex items-start gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-primary"
                  checked={marketingAccepted}
                  onChange={(e) => setMarketingAccepted(e.target.checked)}
                />
                <span>{t("marketingOptIn")}</span>
              </label>
            </div>

            <Button
              className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20"
              onClick={handleSubmit}
              disabled={!form.name || !form.phone || !kvkkAccepted || submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t("confirmButton")}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              {t("confirmHint")}
            </p>
          </div>
        )}
      </div>

      {/* Powered by */}
      <div className="relative text-center py-6">
        <a href="https://bysirius.com" className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">
          ✨ Siriplan ile güçlendirilmiştir · BY Sirius Group
        </a>
      </div>
    </div>
  );
}
