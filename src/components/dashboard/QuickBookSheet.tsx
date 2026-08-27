"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Search, User, Scissors, Clock, Phone, Star, Loader2, X, Check, MessageCircle, Shuffle, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { DateTimeSlotPicker, nextSlot } from "@/components/dashboard/DateTimeSlotPicker";
import { renderWaTemplate, waMessageLink } from "@/lib/wa-template";
import { useMicAccess } from "@/components/dashboard/useMicAccess";

interface StaffCard {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  role?: string;
}

interface ServiceItem {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
}

interface CustomerHit {
  id: string;
  full_name: string;
  phone: string;
  email?: string | null;
  total_visits?: number;
}

/** Personel seçiminde "Farketmez" için kullanılan sentinel değer — backend'e auto_assign_staff olarak iletilir. */
const ANY_STAFF = "__any__";

interface Props {
  /** Pre-selected staff when opening from a staff column in CalendarGrid */
  preselectedStaffId?: string;
  preselectedDate?: string; // yyyy-MM-dd
  orgId: string;
  staff: StaffCard[];
  services: ServiceItem[];
}

export function QuickBookSheet({ preselectedStaffId, preselectedDate, orgId, staff, services }: Props) {
  const router = useRouter();
  const t = useTranslations("dashboard.quickBook");
  const td = useTranslations("dashboard");
  const tm = useTranslations("dashboard.mic");
  const { requestMic, micDialog, speechLang } = useMicAccess();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Voice states
  const [isListening, setIsListening] = useState(false);
  const [voiceSummary, setVoiceSummary] = useState<any | null>(null);
  const [isConfirmingVoice, setIsConfirmingVoice] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Form state
  const [selectedStaffId, setSelectedStaffId] = useState(preselectedStaffId ?? "");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [appointmentAt, setAppointmentAt] = useState(() => nextSlot(preselectedDate));
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [note, setNote] = useState("");

  // Customer search
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<CustomerHit[]>([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerPicked, setCustomerPicked] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Otomatik WhatsApp bilgilendirme mesajı
  const [sendWaMessage, setSendWaMessage] = useState(true);
  const sendWaTouchedRef = useRef(false);
  const [metaAutoOnayActive, setMetaAutoOnayActive] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgAddress, setOrgAddress] = useState("");
  const [orgLocationUrl, setOrgLocationUrl] = useState("");
  const [waTemplate, setWaTemplate] = useState<string | null>(null);
  const [slotMinutes, setSlotMinutes] = useState(15);

  useEffect(() => {
    fetch("/api/org")
      .then((r) => r.json())
      .then((d) => {
        setOrgName(d.org?.name ?? "");
        setOrgAddress(d.org?.address ?? "");
        setOrgLocationUrl(d.org?.location_url ?? "");
        const s = (d.org?.settings_json ?? {}) as Record<string, unknown>;
        setWaTemplate(typeof s.wa_appointment_template === "string" ? s.wa_appointment_template : null);
        const bookingSlot = Number(s.booking_slot_minutes);
        if ([15, 30, 60].includes(bookingSlot)) setSlotMinutes(bookingSlot);
        // Meta üzerinden otomatik onay mesajı varsayılan olarak açık (wa_notify_onay !== false).
        // Aktifse manuel gönderim mükerrerliği önlemek için bu kutuyu varsayılan kapalı başlat —
        // kullanıcı zaten elle değiştirdiyse (sendWaTouchedRef) dokunma.
        const metaActive = s.wa_notify_onay !== false;
        setMetaAutoOnayActive(metaActive);
        if (metaActive && !sendWaTouchedRef.current) setSendWaMessage(false);
      })
      .catch(() => {});
  }, []);

  // Reset on open
  useEffect(() => {
    if (open) {
      setSelectedStaffId(preselectedStaffId ?? "");
      setSelectedServiceId("");
      setAppointmentAt(nextSlot(preselectedDate, slotMinutes));
      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setNote("");
      setCustomerSearch("");
      setCustomerResults([]);
      setCustomerPicked(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const searchCustomers = useCallback((q: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!q.trim()) { setCustomerResults([]); return; }
    searchTimerRef.current = setTimeout(async () => {
      setCustomerLoading(true);
      try {
        const res = await fetch(`/api/customers?q=${encodeURIComponent(q)}&limit=6`);
        const json = await res.json();
        setCustomerResults(json.customers ?? []);
      } finally {
        setCustomerLoading(false);
      }
    }, 280);
  }, []);

  function pickCustomer(c: CustomerHit) {
    setCustomerName(c.full_name);
    setCustomerPhone(c.phone);
    setCustomerEmail(c.email ?? "");
    setCustomerSearch(c.full_name);
    setCustomerResults([]);
    setCustomerPicked(true);
  }

  function clearCustomer() {
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setCustomerSearch("");
    setCustomerResults([]);
    setCustomerPicked(false);
  }

  const selectedService = services.find((s) => s.id === selectedServiceId);

  // Clean up voice on close
  useEffect(() => {
    if (!open) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      setIsListening(false);
      setIsConfirmingVoice(false);
      setVoiceSummary(null);
    }
  }, [open]);

  const startVoiceConfirmation = useCallback(() => {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = speechLang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript?.toLowerCase() || "";
      if (transcript.includes("onay") || transcript.includes("evet") || transcript.includes("kaydet") || transcript.includes("tamam")) {
        toast.success("Sesli onay alındı, kaydediliyor...");
        await saveAppointment();
      } else if (transcript.includes("iptal") || transcript.includes("vazgeç") || transcript.includes("hayır")) {
        toast.info("İptal edildi.");
        setIsConfirmingVoice(false);
        setVoiceSummary(null);
      } else {
        toast.info(`Anlaşılmadı: "${transcript}". 'Onaylıyorum' veya 'İptal' diyebilirsiniz.`);
      }
    };

    recognition.start();
  }, [customerName, customerPhone, selectedStaffId, selectedServiceId, appointmentAt, note, speechLang]);

  const startVoiceBooking = useCallback(async () => {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error(tm("unsupported"));
      return;
    }

    const hasPermission = await requestMic();
    if (!hasPermission) return;

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = speechLang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceSummary(null);
      setIsConfirmingVoice(false);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (e: any) => {
      setIsListening(false);
      if (e.error !== "no-speech") {
        toast.error(tm("captureFailed"));
      }
    };

    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (!transcript) return;

      toast.loading("Sesiniz çözümleniyor...", { id: "voice-parsing" });
      try {
        const res = await fetch("/api/ai/voice-booking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript, parseOnly: true }),
        });
        const data = await res.json();
        toast.dismiss("voice-parsing");

        if (data.actionTaken === "confirm_appointment" && data.parsed) {
          const parsed = data.parsed;
          if (parsed.customer_name) setCustomerName(parsed.customer_name);
          if (parsed.customer_phone) setCustomerPhone(parsed.customer_phone);
          if (parsed.staff_id) setSelectedStaffId(parsed.staff_id);
          if (parsed.service_id) setSelectedServiceId(parsed.service_id);
          if (parsed.appointment_at) {
            const dt = new Date(parsed.appointment_at);
            if (!isNaN(dt.getTime())) {
              const offset = dt.getTimezoneOffset();
              const localDt = new Date(dt.getTime() - offset * 60 * 1000);
              setAppointmentAt(localDt.toISOString().slice(0, 16));
            }
          }
          if (parsed.note) setNote(parsed.note);

          setVoiceSummary(parsed);
          setIsConfirmingVoice(true);

          setTimeout(() => {
            startVoiceConfirmation();
          }, 1000);
        } else {
          toast.error(data.response || "Bilgiler anlaşılamadı. Lütfen tekrar deneyin.");
        }
      } catch {
        toast.dismiss("voice-parsing");
        toast.error("Sesli analiz başarısız oldu.");
      }
    };

    recognition.start();
  }, [slotMinutes, staff, services, startVoiceConfirmation, requestMic, speechLang, tm]);

  async function saveAppointment() {
    if (!selectedStaffId) { toast.error(t("errorStaffRequired")); return false; }
    if (!selectedServiceId) { toast.error(t("errorServiceRequired")); return false; }
    if (!customerName.trim()) { toast.error(t("errorNameRequired")); return false; }
    if (!customerPhone.trim()) { toast.error(t("errorPhoneRequired")); return false; }
    if (!appointmentAt) { toast.error(t("errorDateRequired")); return false; }

    const isAutoAssign = selectedStaffId === ANY_STAFF;

    setLoading(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: orgId,
          ...(isAutoAssign ? { auto_assign_staff: true } : { staff_id: selectedStaffId }),
          service_id: selectedServiceId,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          customer_email: customerEmail.trim() || undefined,
          appointment_at: new Date(appointmentAt).toISOString(),
          note: note.trim() || undefined,
          source: "manual",
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? t("errorCreateFailed"));
        return false;
      }

      const resolvedStaffId = (json.appointment?.staff_id as string | undefined) ?? selectedStaffId;
      const resolvedStaffName = staff.find((s) => s.id === resolvedStaffId)?.full_name;

      toast.success(
        isAutoAssign && resolvedStaffName
          ? t("successCreatedAutoAssigned", { name: resolvedStaffName })
          : t("successCreated")
      );

      if (sendWaMessage && customerPhone.trim()) {
        const text = renderWaTemplate(waTemplate, {
          musteri: customerName.trim(),
          salon: orgName || "Salonumuz",
          appointmentAt,
          hizmet: selectedService?.name,
          personel: resolvedStaffName,
          address: orgAddress,
          locationUrl: orgLocationUrl,
        });
        window.open(waMessageLink(customerPhone.trim(), text), "_blank", "noopener");
      }

      setOpen(false);
      router.refresh();
      return true;
    } catch {
      toast.error(t("errorCreateFailed"));
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await saveAppointment();
  }

  return (
    <div className="flex items-center gap-1.5">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={
          <Button size="sm" className="gap-1.5" />
        }>
          <Plus className="h-4 w-4" />
          {t("addButton")}
        </SheetTrigger>

        <SheetContent side="right" className="overflow-y-auto p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b sticky top-0 bg-background z-10">
            <SheetTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              {t("sheetTitle")}
            </SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6">

            {/* Voice Listening Alert */}
            {isListening && !isConfirmingVoice && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl p-3.5 flex items-center justify-between animate-pulse">
                <span className="text-xs font-semibold flex items-center gap-2">
                  <Mic className="h-4 w-4 text-red-500 animate-bounce" />
                  Dinleniyor... (Ör: "Ahmet Yılmaz yarın 15:30 Saç Kesimi")
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => {
                    if (recognitionRef.current) recognitionRef.current.abort();
                    setIsListening(false);
                  }}
                  className="h-7 px-2 text-xs hover:bg-red-500/20 text-red-600"
                >
                  İptal
                </Button>
              </div>
            )}

            {/* Voice Confirmation Box */}
            {isConfirmingVoice && voiceSummary && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-primary">
                  <Check className="h-4 w-4" />
                  Randevu Bilgilerini Onaylayın
                </h3>
                <div className="text-xs space-y-1.5 text-muted-foreground">
                  <p><strong className="text-foreground">Müşteri:</strong> {voiceSummary.customer_name || "Belirtilmedi"}</p>
                  {voiceSummary.customer_phone && <p><strong className="text-foreground">Telefon:</strong> {voiceSummary.customer_phone}</p>}
                  <p><strong className="text-foreground">Personel:</strong> {voiceSummary.staff_name || "Belirtilmedi"}</p>
                  <p><strong className="text-foreground">Hizmet:</strong> {voiceSummary.service_name || "Belirtilmedi"}</p>
                  <p><strong className="text-foreground">Tarih/Saat:</strong> {voiceSummary.appointment_at ? new Date(voiceSummary.appointment_at).toLocaleString("tr-TR") : "Belirtilmedi"}</p>
                  {voiceSummary.note && <p><strong className="text-foreground">Not:</strong> {voiceSummary.note}</p>}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    type="button"
                    onClick={() => {
                      setIsConfirmingVoice(false);
                      setVoiceSummary(null);
                      saveAppointment();
                    }}
                    className="flex-1"
                  >
                    Onayla ve Kaydet
                  </Button>
                  <Button
                    size="sm"
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsConfirmingVoice(false);
                      setVoiceSummary(null);
                    }}
                    className="flex-1"
                  >
                    Düzenle / İptal
                  </Button>
                </div>
                {isListening && (
                  <p className="text-[10px] text-center text-red-500 animate-pulse font-medium">
                    🎙️ 'Onaylıyorum' veya 'İptal' diyerek sesle kontrol edebilirsiniz.
                  </p>
                )}
              </div>
            )}

          {/* ── Staff picker ── */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <User className="h-3.5 w-3.5" /> {t("staffLabel")}
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedStaffId(ANY_STAFF)}
                className={cn(
                  "col-span-2 flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all",
                  selectedStaffId === ANY_STAFF
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border hover:bg-accent"
                )}
              >
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Shuffle className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{t("staffAnyOption")}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{t("staffAnyHint")}</p>
                </div>
                {selectedStaffId === ANY_STAFF && (
                  <Check className="h-3.5 w-3.5 text-primary ml-auto shrink-0" />
                )}
              </button>
              {staff.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedStaffId(s.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all",
                    selectedStaffId === s.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border hover:bg-accent"
                  )}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-fuchsia-200 dark:from-primary/30 dark:to-fuchsia-900 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                    {s.avatar_url ? (
                      <img src={s.avatar_url} alt={s.full_name} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      s.full_name[0]
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{s.full_name}</p>
                    {s.role && <p className="text-[10px] text-muted-foreground truncate">{s.role}</p>}
                  </div>
                  {selectedStaffId === s.id && (
                    <Check className="h-3.5 w-3.5 text-primary ml-auto shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── Customer search ── */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <Search className="h-3.5 w-3.5" /> {t("customerLabel")}
            </Label>

            {customerPicked ? (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-primary bg-primary/5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{customerName}</p>
                  <p className="text-xs text-muted-foreground">{customerPhone}</p>
                </div>
                <button type="button" onClick={clearCustomer} className="text-muted-foreground hover:text-foreground shrink-0">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder={t("searchPlaceholder")}
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setCustomerName(e.target.value);
                      setCustomerPicked(false);
                      searchCustomers(e.target.value);
                    }}
                    className="pl-8"
                  />
                  {customerLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  )}
                </div>

                {customerResults.length > 0 && (
                  <div className="absolute top-full mt-1 left-0 right-0 z-20 rounded-xl border bg-background shadow-lg overflow-hidden">
                    {customerResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => pickCustomer(c)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors border-b last:border-0"
                      >
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                          {c.full_name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{c.full_name}</p>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Phone className="h-2.5 w-2.5" />{c.phone}
                            {(c.total_visits ?? 0) > 0 && (
                              <span className="ml-1 flex items-center gap-0.5">
                                <Star className="h-2.5 w-2.5 text-amber-500" />
                                {t("visitsCount", { count: c.total_visits })}
                              </span>
                            )}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Phone (always shown if not auto-picked) */}
            {!customerPicked && (
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">{t("phoneLabel")}</Label>
                  <Input
                    placeholder="5xx xxx xx xx"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    type="tel"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">{t("emailLabel")}</Label>
                  <Input
                    placeholder="ornek@mail.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    type="email"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── Service picker ── */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <Scissors className="h-3.5 w-3.5" /> {t("serviceLabel")}
            </Label>
            <Select value={selectedServiceId} onValueChange={(v) => setSelectedServiceId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder={t("servicePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {services.map((svc) => (
                  <SelectItem key={svc.id} value={svc.id}>
                    <span className="flex items-center gap-2">
                      {svc.name}
                      <Badge variant="outline" className="text-[10px] ml-1">
                        ₺{Number(svc.price).toLocaleString("tr-TR")} · {svc.duration_minutes}{td("minutesShort")}
                      </Badge>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedService && (
              <div className="flex gap-4 text-xs text-muted-foreground px-1">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{selectedService.duration_minutes} {td("minutesShort")}</span>
                <span>₺{Number(selectedService.price).toLocaleString("tr-TR")}</span>
              </div>
            )}
          </div>

          {/* ── Tarih & saat — Ayarlar'daki randevu dilimine göre ── */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t("dateTimeLabel")}</Label>
            <DateTimeSlotPicker
              value={appointmentAt}
              onChange={setAppointmentAt}
              minDate={new Date().toISOString().slice(0, 10)}
              slotMinutes={slotMinutes}
            />
          </div>

          {/* ── Note ── */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">{t("noteLabel")}</Label>
            <Input
              placeholder={t("notePlaceholder")}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {/* ── Otomatik WhatsApp mesajı ── */}
          <label className="flex items-start gap-3 p-3 rounded-xl border border-green-200 dark:border-green-900/50 bg-green-50/60 dark:bg-green-950/20 cursor-pointer">
            <input
              type="checkbox"
              checked={sendWaMessage}
              onChange={(e) => {
                sendWaTouchedRef.current = true;
                setSendWaMessage(e.target.checked);
              }}
              className="mt-0.5 h-4 w-4 rounded accent-green-600 shrink-0"
            />
            <span className="min-w-0">
              <span className="text-sm font-medium flex items-center gap-1.5">
                <MessageCircle className="h-3.5 w-3.5 text-green-600" />
                {t("sendWaLabel")}
              </span>
              <span className="block text-xs text-muted-foreground mt-0.5">
                {t("sendWaHint")}
              </span>
              {metaAutoOnayActive && sendWaMessage && (
                <span className="block text-[11px] mt-1 text-amber-600 dark:text-amber-500 font-medium">
                  {t("sendWaMetaActiveHint")}
                </span>
              )}
            </span>
          </label>

          {/* ── Submit ── */}
          <div className="pt-2 border-t">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              {t("submitButton")}
            </Button>
          </div>
        </form>
        </SheetContent>
      </Sheet>

      {/* Voice Booking Mic Button next to the trigger */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          setOpen(true);
          setTimeout(() => {
            startVoiceBooking();
          }, 200);
        }}
        className={cn(
          "h-9 w-9 p-0 shrink-0 border-primary/20 text-primary hover:bg-primary/5 hover:text-primary transition-all",
          isListening ? "border-red-500 text-red-500 animate-pulse bg-red-50 dark:bg-red-950/20" : ""
        )}
        title="Sesle Randevu Oluştur"
      >
        <Mic className="h-4 w-4" />
      </Button>

      {micDialog}
    </div>
  );
}
