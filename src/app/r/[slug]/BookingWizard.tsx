"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, ChevronRight, ChevronLeft, Calendar, Clock } from "lucide-react";
import { toast } from "sonner";
import { format, addDays, type Locale as DateFnsLocale } from "date-fns";
import type { Service, Staff } from "@/types/database";
import { renderKvkkNotice } from "@/lib/kvkk";
import { resolveEligibleStaffIds } from "@/lib/staff-eligibility";
import { zonedWallTimeToUtc, DEFAULT_ORG_TIMEZONE } from "@/lib/istanbul-time";
import { HONEYPOT_FIELD } from "@/lib/bot-guard";
import { formatServicePrice } from "@/lib/currency";
import { isSupportedLanguage, type LanguageCode } from "@/lib/languages";
import type { SalonData } from "./booking-shared";
import { buildCategoryGroups } from "./booking-shared";

export function ServiceButton({
  service, index, onSelect, label, displayName,
}: {
  service: Service;
  index: number;
  onSelect: () => void;
  label: string;
  /** Ziyaretcinin dilindeki ad (bkz. localizeName) — katalog disi adlarda kayitli adin aynisi. */
  displayName: string;
}) {
  return (
    <button
      onClick={onSelect}
      className="animate-fade-up w-full text-left p-4 rounded-2xl border border-border bg-card/70 backdrop-blur-sm transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 active:scale-[0.99] group relative overflow-hidden"
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary/0 group-hover:bg-primary transition-colors" />
      <div className="flex items-center gap-3">
        {service.photo_url && (
          <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 relative">
            <img src={service.photo_url} alt={displayName} loading="lazy" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold group-hover:text-primary transition-colors truncate">{displayName}</p>
            {service.description && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{service.description}</p>}
            <div className="flex items-center gap-1.5 mt-1.5">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{service.duration_minutes} {label}</span>
            </div>
          </div>
          <div className="text-right shrink-0 flex items-center gap-1">
            <p className="font-heading text-lg font-bold text-primary tabular-nums">
              {formatServicePrice(service.price, service.currency)}
            </p>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      </div>
    </button>
  );
}

interface Props {
  salon: SalonData;
  dateLocale: DateFnsLocale;
  /**
   * Vitrin şablonunda hizmet seçimi sihirbazın DIŞINDA (kategori kartlarında)
   * yapılır. Dışarıdan bir hizmet geldiğinde sihirbaz 1. adıma atlar.
   * `pickToken` aynı hizmete tekrar tıklanmasını da tetikleyebilmek içindir.
   */
  preselected?: { service: Service; token: number } | null;
  /** Vitrin şablonunda 0. adım (hizmet listesi) gizlenir — seçim yukarıda yapıldı. */
  hideServiceStep?: boolean;
  /** Sihirbaz kendi başlığını çizsin mi (klasik şablonda adım göstergesi zaten var). */
  showSteps?: boolean;
  /** Randevu tamamlandığında (vitrin şablonunda sabit butonu gizlemek için). */
  onDone?: (done: boolean) => void;
  /** Verilirse kategori galerisi fotoğrafları tıklanabilir olur ve tam ekran açılır. */
  onPhotoOpen?: (photos: { id: string; url: string }[], index: number) => void;
  /** Telefonundan tanınan dönen müşterinin kayıtlı dil tercihi. */
  onDetectedLanguage?: (l: LanguageCode) => void;
}

export function BookingWizard({
  salon, dateLocale, preselected, hideServiceStep = false, showSteps = true, onDone, onPhotoOpen, onDetectedLanguage,
}: Props) {
  const t = useTranslations("booking.public");
  const { org, services, categories, staff, staffServiceMap, localizeName, lang } = salon;

  const STEPS = [t("stepService"), t("stepStaffTime"), t("stepYourInfo")];
  const firstStep = hideServiceStep ? 1 : 0;

  const [step, setStep] = useState(firstStep);
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

  // Vitrin şablonu: dışarıdaki kategori kartından hizmet seçildi.
  const lastToken = useRef<number>(-1);
  useEffect(() => {
    if (!preselected || preselected.token === lastToken.current) return;
    lastToken.current = preselected.token;
    setSelectedService(preselected.service);
    setSelectedStaff(null);
    setAnyStaff(false);
    setSelectedDate("");
    setSelectedSlot("");
    setStep(1);
  }, [preselected]);

  useEffect(() => { onDone?.(done); }, [done, onDone]);

  // Dönen müşteri tespiti: telefon numarası yeterince uzunsa (10+ hane),
  // müşterinin daha önce kaydettiği dil tercihi varsa sayfa o dile geçer.
  useEffect(() => {
    if (!onDetectedLanguage) return;
    const digits = form.phone.replace(/\D/g, "");
    if (digits.length < 10) return;
    const timeout = setTimeout(() => {
      fetch(`/api/public/customer-language?slug=${org.slug}&phone=${encodeURIComponent(form.phone)}`)
        .then((r) => r.json())
        .then((d) => {
          if (isSupportedLanguage(d.preferred_language)) onDetectedLanguage(d.preferred_language);
        })
        .catch(() => {});
    }, 500);
    return () => clearTimeout(timeout);
  }, [form.phone, org.slug, onDetectedLanguage]);

  // Seçilen hizmete atanmış personel varsa (staff_services), sadece onları göster —
  // aksi halde (kısıtlama yoksa) tüm aktif personel aday kabul edilir. Bu, backend'in
  // findAvailableStaff fallback mantığıyla (bkz. staff-availability.ts) birebir aynı
  // olmalı; aksi halde "Farketmez" seçiminde UI'da müsait görünen bir saat backend'de
  // "Seçilen saatte uygun personel yok" hatası verebilir.
  // useMemo şart: bu değer olmadan her render'da yeni bir dizi referansı
  // üretilir, aşağıdaki "saat müsaitliği" effect'i buna bağımlı olduğundan
  // her render'ı yeniden tetikler → sonsuz döngü → saat seçimi ekranda sürekli
  // "yükleniyor" spinner'ında donup asla açılmaz.
  const eligibleStaff = useMemo(() => {
    if (!selectedService) return staff;
    const assignedIds = staffServiceMap[selectedService.id] ?? [];
    const eligibleIds = new Set(resolveEligibleStaffIds(staff.map((s) => s.id), assignedIds));
    return staff.filter((s) => eligibleIds.has(s.id));
  }, [staff, staffServiceMap, selectedService]);

  // Müsait saatler — "Farketmez" seçiliyse tüm aday personelin müsaitliği birleştirilir.
  useEffect(() => {
    if ((!selectedStaff && !anyStaff) || !selectedService || !selectedDate) return;
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
      .then((lists) => setSlots(Array.from(new Set(lists.flat())).sort()))
      .finally(() => setLoadingSlots(false));
  }, [selectedStaff, anyStaff, eligibleStaff, selectedService, selectedDate, org.slug]);

  async function handleSubmit() {
    if (!selectedService || (!selectedStaff && !anyStaff) || !selectedDate || !selectedSlot || !kvkkAccepted) return;
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
          // Bu istek herkese açık randevu sayfasından geliyor. Salon sahibi
          // kendi tarayıcısında panele girmişken bu linki açtığında oturum
          // çerezi /api/appointments'a da gider ve istek "panelden girilmiş"
          // sanılıyordu — engellenen müşteri, online'a kapalı hizmet ve fiyat
          // koruması dahil tüm anonim akış kontrolleri sessizce atlanıyordu.
          booking_context: "public",
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

  function resetWizard() {
    setDone(false);
    setStep(firstStep);
    setSelectedService(null);
    setSelectedStaff(null);
    setAnyStaff(false);
    setSelectedDate("");
    setSelectedSlot("");
    setSlots([]);
    setForm({ name: "", phone: "", email: "", note: "", website: "" });
    setKvkkAccepted(false);
    setMarketingAccepted(false);
    formStartedAt.current = Date.now();
    lastToken.current = -1;
  }

  // Önümüzdeki 30 gün (~1 ay) — bkz. appointments/route.ts ONE_YEAR_MS üst sınırı
  const dateOptions = Array.from({ length: 30 }, (_, i) => {
    const d = addDays(new Date(), i);
    return { value: format(d, "yyyy-MM-dd"), label: format(d, "d MMM, EEE", { locale: dateLocale }) };
  });

  if (done) {
    return (
      <Card className="relative max-w-md w-full mx-auto text-center border-0 shadow-2xl shadow-primary/10 animate-fade-up overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-primary via-accent to-primary" />
        <CardContent className="p-6 sm:p-8">
          <div className="relative w-20 h-20 mx-auto mb-5">
            <div className="absolute inset-0 rounded-full bg-emerald-100 dark:bg-emerald-900/30 animate-pulse" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <CheckCircle2 className="h-9 w-9 text-white" strokeWidth={2.5} />
            </div>
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/70 mb-1">{t("confirmedBadge")}</p>
          <h2 className="font-heading text-3xl font-bold mb-2 text-balance">{t("successTitle")}</h2>
          <p className="text-muted-foreground mb-6 text-sm">
            {t("successMessage", { service: localizeName(selectedService?.name) })}
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
              <span className="font-medium text-right">{localizeName(selectedService?.name)}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {t("waReminderNote")}
          </p>
          <Button variant="outline" className="w-full" onClick={resetWizard}>
            {t("newAppointmentButton")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const categorizedGroups = buildCategoryGroups(categories, services).filter((g) => g.items.length > 0);
  const uncategorizedServices = services.filter((s) => !s.category_id);

  return (
    <div>
      {/* Adım göstergesi */}
      {showSteps && (
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
      )}

      {/* Adım 0: Hizmet seçimi */}
      {step === 0 && (
        <div className="space-y-2.5">
          <div className="mb-5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/70">{t("step1Label")}</span>
            <h2 className="font-heading text-2xl font-bold">{t("chooseServiceTitle")}</h2>
          </div>
          {services.length === 0 && (
            <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-border bg-card/50">
              <p className="text-sm text-muted-foreground">{t("noServicesAvailable")}</p>
              {org.phone && (
                <p className="text-sm text-muted-foreground mt-2">
                  {t("callToBook")}{" "}
                  <a href={`tel:${org.phone}`} className="text-primary font-medium hover:underline">{org.phone}</a>
                </p>
              )}
            </div>
          )}
          {categorizedGroups.length > 0 ? (
            <div className="space-y-6">
              {categorizedGroups.map(({ category, items, photos }) => (
                <div key={category.id}>
                  <div className="flex items-center gap-2.5 mb-2.5">
                    {category.photo_url ? (
                      <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 relative">
                        <img src={category.photo_url} alt={localizeName(category.name)} loading="lazy" className="w-full h-full object-cover" />
                      </div>
                    ) : null}
                    <h3 className="font-heading font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                      {localizeName(category.name)}
                    </h3>
                  </div>
                  {photos.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 mb-2.5 -mx-1 px-1 snap-x">
                      {photos.map((p, pi) => (
                        <button
                          key={p.id}
                          type="button"
                          disabled={!onPhotoOpen}
                          onClick={() => onPhotoOpen?.(photos.map((x) => ({ id: x.id, url: x.url })), pi)}
                          className="w-24 h-24 rounded-xl overflow-hidden shrink-0 relative snap-start transition-transform enabled:hover:scale-[1.03] enabled:cursor-zoom-in"
                        >
                          <img src={p.url} alt={localizeName(category.name)} loading="lazy" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="space-y-2.5">
                    {items.map((s, i) => (
                      <ServiceButton key={s.id} service={s} displayName={localizeName(s.name)} index={i} onSelect={() => { setSelectedService(s); setStep(1); }} label={t("minutesShort")} />
                    ))}
                  </div>
                </div>
              ))}
              {uncategorizedServices.length > 0 && (
                <div>
                  <h3 className="font-heading font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2.5">
                    {t("otherServices")}
                  </h3>
                  <div className="space-y-2.5">
                    {uncategorizedServices.map((s, i) => (
                      <ServiceButton key={s.id} service={s} displayName={localizeName(s.name)} index={i} onSelect={() => { setSelectedService(s); setStep(1); }} label={t("minutesShort")} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            services.map((s, i) => (
              <ServiceButton key={s.id} service={s} displayName={localizeName(s.name)} index={i} onSelect={() => { setSelectedService(s); setStep(1); }} label={t("minutesShort")} />
            ))
          )}
        </div>
      )}

      {/* Adım 1: Personel + Tarih + Saat */}
      {step === 1 && (
        <div className="space-y-6 animate-fade-up">
          <div className="flex items-center gap-3 mb-1">
            {!hideServiceStep && (
              <button onClick={() => setStep(0)} aria-label={t("stepService")} className="p-1.5 hover:bg-accent rounded-lg transition-colors shrink-0">
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/70">{t("step2Label")}</span>
              <h2 className="font-heading text-2xl font-bold leading-tight">{t("stepStaffTime")}</h2>
            </div>
          </div>

          {selectedService ? (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-primary/5 border border-primary/20 flex-wrap">
              <Badge variant="secondary" className="font-heading">{localizeName(selectedService.name)}</Badge>
              <span className="text-sm text-muted-foreground tabular-nums">
                {formatServicePrice(selectedService.price, selectedService.currency)} • {selectedService.duration_minutes}{t("minutesShort")}
              </span>
            </div>
          ) : (
            /*
              Vitrin şablonunda hizmet yukarıdaki kategori kartlarından seçilir; ziyaretçi
              doğrudan randevu bölümüne kaydırdıysa burada seçimsiz kalır. Sihirbazı çıkmaz
              sokakta bırakmamak için sade bir hizmet listesi gösterilir.
            */
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t("pickServiceFirst")}</p>
              {services.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedService(s)}
                  className="w-full flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card/60 text-left hover:border-primary transition-colors"
                >
                  <span className="font-medium truncate">{localizeName(s.name)}</span>
                  <span className="text-sm text-primary font-semibold tabular-nums shrink-0">
                    {formatServicePrice(s.price, s.currency)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {selectedService && (
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
                    <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center font-semibold text-primary text-sm shrink-0">?</div>
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
                      {s.avatar_url ? (
                        <img src={s.avatar_url} alt="" loading="lazy" className="w-9 h-9 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/25 to-accent/40 flex items-center justify-center font-heading font-semibold text-primary text-sm shrink-0">
                          {s.full_name[0]}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{s.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{s.role}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedService && (selectedStaff || anyStaff) && (
            <div>
              <p className="text-sm font-semibold mb-2.5">{t("chooseDateTitle")}</p>
              <div className="flex gap-2 overflow-x-auto pb-2 snap-x">
                {dateOptions.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => { setSelectedDate(d.value); setSelectedSlot(""); }}
                    className={`flex-shrink-0 px-3.5 py-2.5 rounded-2xl border-2 text-center transition-all snap-start ${
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

          {selectedService && selectedDate && (selectedStaff || anyStaff) && (
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
            <Button className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20 gap-1.5 animate-fade-up" onClick={() => setStep(2)}>
              {t("continueButton")} <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* Adım 2: İletişim bilgileri */}
      {step === 2 && (
        <div className="space-y-5 animate-fade-up">
          <div className="flex items-center gap-3 mb-1">
            <button onClick={() => setStep(1)} aria-label={t("stepStaffTime")} className="p-1.5 hover:bg-accent rounded-lg transition-colors shrink-0">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/70">{t("step3Label")}</span>
              <h2 className="font-heading text-2xl font-bold leading-tight">{t("enterInfoTitle")}</h2>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/8 to-accent/10 border border-primary/15 space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground flex-wrap">
              <Calendar className="h-4 w-4" />
              <span className="capitalize">{selectedDate && format(new Date(selectedDate + "T12:00:00"), "d MMMM yyyy, EEEE", { locale: dateLocale })}</span>
              <Clock className="h-4 w-4 ml-2" />
              <span className="font-semibold text-foreground tabular-nums">{selectedSlot}</span>
            </div>
            <p><span className="text-muted-foreground">{t("serviceLabel")}</span> <span className="font-medium">{localizeName(selectedService?.name)}</span></p>
            <p><span className="text-muted-foreground">{t("staffLabel")}</span> <span className="font-medium">{anyStaff ? t("autoAssignLabel") : selectedStaff?.full_name}</span></p>
            <p className="font-heading font-bold text-primary text-lg pt-1">
              {formatServicePrice(selectedService?.price ?? null, selectedService?.currency)}
            </p>
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
                autoComplete="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1.5 h-11 rounded-xl"
              />
            </div>
            <div>
              <Label>{t("phoneLabel")}</Label>
              <Input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
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
                inputMode="email"
                autoComplete="email"
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
              <input type="checkbox" className="mt-0.5 accent-primary" checked={kvkkAccepted} onChange={(e) => setKvkkAccepted(e.target.checked)} />
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
              <input type="checkbox" className="mt-0.5 accent-primary" checked={marketingAccepted} onChange={(e) => setMarketingAccepted(e.target.checked)} />
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

          <p className="text-xs text-center text-muted-foreground">{t("confirmHint")}</p>
        </div>
      )}
    </div>
  );
}
