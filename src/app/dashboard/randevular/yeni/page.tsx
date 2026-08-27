"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Search, X, Star, Clock, TrendingUp, Plus, MessageCircle } from "lucide-react";
import type { Staff, Service } from "@/types/database";
import { DateTimeSlotPicker } from "@/components/dashboard/DateTimeSlotPicker";
import { CustomerSearchField } from "@/components/dashboard/CustomerSearchField";
import { renderWaTemplate, waMessageLink } from "@/lib/wa-template";

const FAVORITES_KEY = "siriplan_fav_services";

function getFavorites(): string[] {
  try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]"); } catch { return []; }
}
function addFavorite(id: string) {
  const favs = getFavorites().filter((f) => f !== id);
  favs.unshift(id);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs.slice(0, 10)));
}

interface SelectedService {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
}

/** Vitrin-only hizmetlerin (fiyat/süre tanımsız) randevu oluşturmada seçilmesini engeller. */
type BookableService = Service & { price: number; duration_minutes: number };
function isBookable(s: Service): s is BookableService {
  return s.is_bookable_online && s.price != null && s.duration_minutes != null;
}

export default function YeniRandevuPage() {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<BookableService[]>([]);
  const [orgId, setOrgId] = useState<string>("");
  const [orgName, setOrgName] = useState<string>("");
  const [orgAddress, setOrgAddress] = useState<string>("");
  const [orgLocationUrl, setOrgLocationUrl] = useState<string>("");
  const [waTemplate, setWaTemplate] = useState<string | null>(null);
  const [sendWaMessage, setSendWaMessage] = useState(true);
  const sendWaTouchedRef = useRef(false);
  const [metaAutoOnayActive, setMetaAutoOnayActive] = useState(false);
  const [kvkkAttested, setKvkkAttested] = useState(false);
  const [slotMinutes, setSlotMinutes] = useState(15);

  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    staff_id: "",
    appointment_at: "",
    note: "",
    source: "yuzyuze" as const,
  });

  // Multi-service state
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [serviceSearch, setServiceSearch] = useState("");
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const [fromWaitlistId, setFromWaitlistId] = useState<string | null>(null);

  useEffect(() => {
    setFavorites(getFavorites());
    // useSearchParams statik prerender'da Suspense istediği için window'dan okunur
    const qs = new URLSearchParams(window.location.search);
    const prefillName = qs.get("customer_name") || "";
    const prefillPhone = qs.get("customer_phone") || "";
    const prefillStaffId = qs.get("staff_id") || "";
    const prefillServiceId = qs.get("service_id") || "";
    const prefillDate = qs.get("date") || "";
    const prefillTime = qs.get("time") || "";
    setFromWaitlistId(qs.get("from_waitlist"));
    if (prefillName || prefillPhone || prefillStaffId || prefillDate) {
      setForm((f) => ({
        ...f,
        customer_name: prefillName || f.customer_name,
        customer_phone: prefillPhone || f.customer_phone,
        staff_id: prefillStaffId || f.staff_id,
        // Takvimde saat dilimine tıklandığında gelir — kullanıcı saati tekrar seçmesin.
        appointment_at: prefillDate ? `${prefillDate}T${prefillTime || "09:00"}` : f.appointment_at,
      }));
    }

    Promise.all([
      fetch("/api/staff").then((r) => r.json()),
      fetch("/api/services").then((r) => r.json()),
      fetch("/api/org").then((r) => r.json()),
    ])
      .then(([staffData, servicesData, orgData]) => {
        setStaff(staffData.staff || []);
        const bookableServices = ((servicesData.services || []) as Service[]).filter(isBookable);
        setServices(bookableServices);
        setOrgId(orgData.org?.id || "");
        setOrgName(orgData.org?.name || "");
        setOrgAddress(orgData.org?.address || "");
        setOrgLocationUrl(orgData.org?.location_url || "");
        const settings = (orgData.org?.settings_json ?? {}) as Record<string, unknown>;
        setWaTemplate(typeof settings.wa_appointment_template === "string" ? settings.wa_appointment_template : null);
        const bookingSlot = Number(settings.booking_slot_minutes);
        if ([15, 30, 60].includes(bookingSlot)) setSlotMinutes(bookingSlot);
        // Meta üzerinden otomatik onay mesajı varsayılan olarak açık (wa_notify_onay !== false).
        // Aktifse manuel gönderim mükerrerliği önlemek için bu kutuyu varsayılan kapalı başlat —
        // kullanıcı zaten elle değiştirdiyse (sendWaTouchedRef) dokunma.
        const metaActive = settings.wa_notify_onay !== false;
        setMetaAutoOnayActive(metaActive);
        if (metaActive && !sendWaTouchedRef.current) setSendWaMessage(false);

        if (prefillServiceId) {
          const svc = bookableServices.find((s) => s.id === prefillServiceId);
          if (svc) {
            setSelectedServices([{ id: svc.id, name: svc.name, price: Number(svc.price), duration_minutes: svc.duration_minutes }]);
          }
        }
      })
      .catch(() => toast.error("Veriler yüklenemedi"))
      .finally(() => setDataLoading(false));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowServiceDropdown(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const totalPrice = selectedServices.reduce((s, x) => s + x.price, 0);
  const totalDuration = selectedServices.reduce((s, x) => s + x.duration_minutes, 0);

  // Filtered services for dropdown
  const q = serviceSearch.toLowerCase();
  const notSelected = services.filter((s) => !selectedServices.find((x) => x.id === s.id));
  const filteredServices = q
    ? notSelected.filter((s) => s.name.toLowerCase().includes(q))
    : notSelected;

  // Sort: favorites first, then rest
  const favoriteServices = filteredServices.filter((s) => favorites.includes(s.id));
  const otherServices = filteredServices.filter((s) => !favorites.includes(s.id));
  const sortedServices = [...favoriteServices, ...otherServices];

  function selectService(svc: BookableService) {
    const item: SelectedService = {
      id: svc.id,
      name: svc.name,
      price: Number(svc.price),
      duration_minutes: svc.duration_minutes,
    };
    setSelectedServices((prev) => [...prev, item]);
    addFavorite(svc.id);
    setFavorites(getFavorites());
    setServiceSearch("");
    setShowServiceDropdown(false);
  }

  function removeService(id: string) {
    setSelectedServices((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.staff_id || selectedServices.length === 0 || !form.appointment_at) {
      return toast.error("Personel, en az bir hizmet ve tarih/saat zorunlu");
    }

    const [primaryService, ...extraServices] = selectedServices;

    setLoading(true);
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        customer_email: form.customer_email || undefined,
        note: form.note || undefined,
        org_id: orgId,
        service_id: primaryService.id,
        extra_services_json: extraServices,
        total_price_override: totalPrice,
        total_duration_override: totalDuration,
        // Yerel saati ISO'ya çevir — raw "yyyy-MM-ddTHH:mm" gönderilirse
        // Postgres UTC sanıp +3 saat kaydırıyordu (takvimde kayıp/yanlış saat).
        appointment_at: new Date(form.appointment_at).toISOString(),
        ...(kvkkAttested
          ? {
              kvkk_consent: true,
              kvkk_notice_snapshot: "Müşteri sözlü/yazılı olarak personel huzurunda KVKK onayı verdi.",
              kvkk_captured_via: "staff_attested",
            }
          : {}),
      }),
    });
    setLoading(false);

    if (res.ok) {
      toast.success("Randevu oluşturuldu");

      if (fromWaitlistId) {
        fetch(`/api/waitlist/${fromWaitlistId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "booked" }),
        }).catch(() => {});
      }

      // Otomatik WhatsApp mesajı: hazır metinle müşterinin sohbetini aç
      if (sendWaMessage && form.customer_phone) {
        const text = renderWaTemplate(waTemplate, {
          musteri: form.customer_name,
          salon: orgName || "Salonumuz",
          appointmentAt: form.appointment_at,
          hizmet: selectedServices.map((s) => s.name).join(", "),
          personel: staff.find((s) => s.id === form.staff_id)?.full_name,
          address: orgAddress,
          locationUrl: orgLocationUrl,
        });
        window.open(waMessageLink(form.customer_phone, text), "_blank", "noopener");
      }

      // Takvime yönlendir ve haftayı randevu tarihine göre aç
      const apptDate = form.appointment_at.slice(0, 10);
      router.push(`/dashboard/takvim?date=${apptDate}`);
    } else {
      const err = await res.json();
      toast.error(typeof err.error === "string" ? err.error : "Randevu oluşturulamadı");
    }
  }

  const now = new Date();
  const minDate = now.toISOString().slice(0, 16);

  return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/randevular" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/70">{t("apptNew.eyebrow")}</span>
          <h1 className="text-xl font-bold brand-gradient-text leading-tight">{t("apptNew.title")}</h1>
        </div>
      </div>

      <Card className="kpi-tile border-0 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("apptNew.cardTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {dataLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Customer */}
              <div className="space-y-3 pb-3 border-b">
                <p className="text-sm font-medium text-muted-foreground">Müşteri Bilgileri</p>
                <CustomerSearchField
                  name={form.customer_name}
                  phone={form.customer_phone}
                  email={form.customer_email}
                  onNameChange={(v) => setForm((f) => ({ ...f, customer_name: v }))}
                  onPhoneChange={(v) => setForm((f) => ({ ...f, customer_phone: v }))}
                  onEmailChange={(v) => setForm((f) => ({ ...f, customer_email: v }))}
                />
              </div>

              {/* Appointment Details */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Randevu Detayları</p>

                <div className="space-y-1">
                  <Label>Personel *</Label>
                  <Select value={form.staff_id} onValueChange={(v) => v && setForm((f) => ({ ...f, staff_id: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Personel seçin">
                        {(value: string) => staff.find((s) => s.id === value)?.full_name || "Personel seçin"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {staff.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Multi-service picker */}
                <div className="space-y-2">
                  <Label>Hizmetler *</Label>

                  {/* Selected services */}
                  {selectedServices.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2 bg-muted/50 rounded-lg">
                      {selectedServices.map((svc) => (
                        <Badge key={svc.id} variant="secondary" className="text-xs gap-1 pr-1 py-1">
                          {svc.name}
                          <span className="text-muted-foreground">₺{svc.price.toLocaleString("tr-TR")}</span>
                          <button
                            type="button"
                            onClick={() => removeService(svc.id)}
                            className="ml-0.5 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Totals */}
                  {selectedServices.length > 0 && (
                    <div className="flex gap-4 text-xs text-muted-foreground px-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Toplam: {totalDuration} dk
                      </span>
                      <span className="font-medium text-foreground">
                        ₺{totalPrice.toLocaleString("tr-TR")}
                      </span>
                    </div>
                  )}

                  {/* Search + dropdown */}
                  <div ref={searchRef} className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder={selectedServices.length === 0 ? "Hizmet ara veya seç..." : "Başka hizmet ekle..."}
                        className="pl-9 pr-9"
                        value={serviceSearch}
                        onChange={(e) => {
                          setServiceSearch(e.target.value);
                          setShowServiceDropdown(true);
                        }}
                        onFocus={() => setShowServiceDropdown(true)}
                      />
                      {serviceSearch && (
                        <button
                          type="button"
                          onClick={() => setServiceSearch("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {showServiceDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                        {sortedServices.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">Hizmet bulunamadı</p>
                        ) : (
                          <>
                            {!serviceSearch && favoriteServices.length > 0 && (
                              <div className="px-3 pt-2 pb-1">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3" /> Son Kullanılanlar
                                </p>
                              </div>
                            )}
                            {sortedServices.map((svc, idx) => {
                              const isFav = favorites.includes(svc.id);
                              const showDivider = !serviceSearch && isFav !== (sortedServices[idx - 1] ? favorites.includes(sortedServices[idx - 1].id) : isFav) && idx > 0;
                              return (
                                <div key={svc.id}>
                                  {showDivider && (
                                    <div className="px-3 pt-2 pb-1 border-t">
                                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                        <Plus className="h-3 w-3" /> Tüm Hizmetler
                                      </p>
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => selectService(svc)}
                                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-accent text-sm transition-colors"
                                  >
                                    <span className="flex items-center gap-2">
                                      {isFav && <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />}
                                      <span className="text-left">{svc.name}</span>
                                    </span>
                                    <span className="text-xs text-muted-foreground shrink-0 ml-2">
                                      {svc.duration_minutes}dk · ₺{Number(svc.price).toLocaleString("tr-TR")}
                                    </span>
                                  </button>
                                </div>
                              );
                            })}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Tarih & Saat * <span className="text-[10px] text-muted-foreground">({slotMinutes} dk aralıklarla)</span></Label>
                  <DateTimeSlotPicker
                    value={form.appointment_at}
                    onChange={(v) => setForm((f) => ({ ...f, appointment_at: v }))}
                    minDate={minDate.slice(0, 10)}
                    slotMinutes={slotMinutes}
                  />
                </div>

                <div className="space-y-1">
                  <Label>Kaynak</Label>
                  <Select value={form.source} onValueChange={(v) => setForm((f) => ({ ...f, source: v as typeof form.source }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yuzyuze">Yüz yüze</SelectItem>
                      <SelectItem value="telefon">Telefon</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="web">Web</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <label className="flex items-start gap-2 text-xs cursor-pointer p-2 rounded-lg border border-border">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={kvkkAttested}
                    onChange={(e) => setKvkkAttested(e.target.checked)}
                  />
                  <span>Müşteri KVKK onayı verdi (sözlü/yazılı olarak yüz yüze/telefonda alındı)</span>
                </label>

                <div className="space-y-1">
                  <Label>Not</Label>
                  <Input
                    value={form.note}
                    onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                    placeholder="Opsiyonel not..."
                  />
                </div>

                {/* Otomatik WhatsApp bilgilendirme mesajı */}
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
                      Müşteriye WhatsApp mesajı gönder
                    </span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      Randevu oluşturulunca hazır bilgilendirme metniyle WhatsApp açılır —
                      göndermek için tek dokunuş yeter. Metni Ayarlar&apos;dan değiştirebilirsiniz.
                    </span>
                    {metaAutoOnayActive && sendWaMessage && (
                      <span className="block text-[11px] mt-1 text-amber-600 dark:text-amber-500 font-medium">
                        Meta üzerinden otomatik onay mesajı zaten aktif — bunu da işaretlerseniz müşteri
                        aynı bilgiyi iki kez alabilir. Kapatmak için Ayarlar → WhatsApp Bildirim Ayarları&apos;na bakın.
                      </span>
                    )}
                    {form.customer_name && form.appointment_at && (
                      <span className="block text-[11px] mt-1.5 p-2 rounded-lg bg-background/80 border border-border text-muted-foreground italic">
                        &quot;{renderWaTemplate(waTemplate, {
                          musteri: form.customer_name,
                          salon: orgName || "Salonumuz",
                          appointmentAt: form.appointment_at,
                          hizmet: selectedServices.map((s) => s.name).join(", "),
                          personel: staff.find((s) => s.id === form.staff_id)?.full_name,
                          address: orgAddress,
          locationUrl: orgLocationUrl,
                        })}&quot;
                      </span>
                    )}
                  </span>
                </label>
              </div>

              <Button type="submit" className="w-full mt-2" disabled={loading || selectedServices.length === 0}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {t("apptNew.submitButton")}
                {selectedServices.length > 0 && (
                  <span className="ml-2 opacity-80">· ₺{totalPrice.toLocaleString("tr-TR")}</span>
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
