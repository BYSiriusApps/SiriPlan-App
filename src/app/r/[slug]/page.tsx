"use client";

import { useState, useEffect, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, ChevronRight, ChevronLeft, Calendar, Clock } from "lucide-react";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { tr } from "date-fns/locale";
import type { Service, Staff, Organization } from "@/types/database";
import { renderKvkkNotice } from "@/lib/kvkk";

const STEPS = ["Hizmet Seç", "Personel & Saat", "Bilgilerini Gir"];

export default function PublicBookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const [step, setStep] = useState(0);
  const [org, setOrg] = useState<Organization | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
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
  });
  const [kvkkAccepted, setKvkkAccepted] = useState(false);
  const [marketingAccepted, setMarketingAccepted] = useState(false);
  const [showKvkkText, setShowKvkkText] = useState(false);

  // Load org data
  useEffect(() => {
    const supabase = createClient();
    supabase.from("organizations").select("*, services(*), staff(*)").eq("slug", slug).single()
      .then(({ data }) => {
        if (!data) return;
        setOrg(data as Organization);
        setServices((data.services || []).filter((s: Service) => s.is_active && s.is_bookable_online !== false));
        setStaff((data.staff || []).filter((s: Staff) => s.is_active));
      });
  }, [slug]);

  // Load available slots when date/staff/service changes — "Farketmez" seçiliyse
  // tüm personelin müsaitliğini birleştirip (union) tek bir saat listesi gösterir.
  useEffect(() => {
    if ((!selectedStaff && !anyStaff) || !selectedService || !selectedDate || !org) return;
    setLoadingSlots(true);
    const candidateStaff = anyStaff ? staff : selectedStaff ? [selectedStaff] : [];
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
  }, [selectedStaff, anyStaff, staff, selectedService, selectedDate, org]);

  async function handleSubmit() {
    if (!org || !selectedService || (!selectedStaff && !anyStaff) || !selectedDate || !selectedSlot || !kvkkAccepted) return;
    setSubmitting(true);
    const appointmentAt = new Date(`${selectedDate}T${selectedSlot}:00`).toISOString();
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
      }),
    });
    if (res.ok) {
      setDone(true);
    } else {
      const err = await res.json();
      toast.error(err.error || "Bir hata oluştu.");
    }
    setSubmitting(false);
  }

  // Next 14 days for date picker
  const dateOptions = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(new Date(), i);
    return {
      value: format(d, "yyyy-MM-dd"),
      label: format(d, "d MMM, EEE", { locale: tr }),
    };
  });

  if (!org) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-fuchsia-50 dark:from-zinc-950 dark:to-purple-950/30 p-4">
        <Card className="max-w-md w-full text-center border-0 shadow-xl">
          <CardContent className="p-8">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Randevu Onaylandı!</h2>
            <p className="text-muted-foreground mb-4">
              <span className="font-semibold">{selectedService?.name}</span> için randevunuz oluşturuldu.
            </p>
            <div className="bg-muted/50 rounded-xl p-4 text-sm space-y-1 text-left mb-6">
              <p><span className="text-muted-foreground">Salon:</span> {org.name}</p>
              <p><span className="text-muted-foreground">Tarih:</span> {selectedDate && format(new Date(selectedDate + "T12:00:00"), "d MMMM yyyy, EEEE", { locale: tr })}</p>
              <p><span className="text-muted-foreground">Saat:</span> {selectedSlot}</p>
              <p><span className="text-muted-foreground">Personel:</span> {anyStaff ? "Otomatik atanacak" : selectedStaff?.full_name}</p>
              <p><span className="text-muted-foreground">Hizmet:</span> {selectedService?.name}</p>
            </div>
            <p className="text-xs text-muted-foreground">WhatsApp hatırlatması gönderilecek.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-background to-fuchsia-50 dark:from-zinc-950 dark:via-background dark:to-purple-950/30">
      {/* Salon header */}
      <div className="bg-card border-b shadow-sm">
        <div className="max-w-xl mx-auto p-4 flex items-center gap-3">
          {org.logo_url ? (
            <img src={org.logo_url} alt={org.name} className="w-12 h-12 rounded-xl object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-xl">
              {org.name[0]}
            </div>
          )}
          <div>
            <h1 className="font-bold text-lg">{org.name}</h1>
            {org.city && <p className="text-sm text-muted-foreground">{org.city}</p>}
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto p-4 py-8">
        {/* Step indicator */}
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  i < step ? "bg-primary text-primary-foreground" :
                  i === step ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${i === step ? "text-primary" : "text-muted-foreground"}`}>{s}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${i < step ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 0: Service selection */}
        {step === 0 && (
          <div className="space-y-3">
            <h2 className="text-xl font-bold mb-4">Hizmet Seçin</h2>
            {services.map((s) => (
              <button
                key={s.id}
                onClick={() => { setSelectedService(s); setStep(1); }}
                className="w-full text-left p-4 rounded-xl border-2 transition-all hover:border-primary hover:shadow-md group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold group-hover:text-primary transition-colors">{s.name}</p>
                    {s.description && <p className="text-sm text-muted-foreground mt-0.5">{s.description}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{s.duration_minutes} dk</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">₺{Number(s.price).toLocaleString("tr-TR")}</p>
                    <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground group-hover:text-primary" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 1: Staff + Date + Slot */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setStep(0)} className="p-1 hover:bg-accent rounded-lg transition-colors">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="text-xl font-bold">Personel & Saat</h2>
            </div>

            {selectedService && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
                <Badge variant="secondary">{selectedService.name}</Badge>
                <span className="text-sm text-muted-foreground">₺{Number(selectedService.price).toLocaleString("tr-TR")} • {selectedService.duration_minutes}dk</span>
              </div>
            )}

            {/* Staff selection */}
            <div>
              <p className="text-sm font-medium mb-2">Personel Seçin</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setAnyStaff(true); setSelectedStaff(null); setSelectedSlot(""); }}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    anyStaff ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-semibold text-primary text-sm">
                      ?
                    </div>
                    <div>
                      <p className="text-sm font-medium">Farketmez</p>
                      <p className="text-xs text-muted-foreground">Uygun ilk personel</p>
                    </div>
                  </div>
                </button>
                {staff.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setAnyStaff(false); setSelectedStaff(s); setSelectedSlot(""); }}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      !anyStaff && selectedStaff?.id === s.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-semibold text-primary text-sm">
                        {s.full_name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{s.full_name}</p>
                        <p className="text-xs text-muted-foreground">{s.role}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Date selection */}
            {(selectedStaff || anyStaff) && (
              <div>
                <p className="text-sm font-medium mb-2">Tarih Seçin</p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {dateOptions.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => { setSelectedDate(d.value); setSelectedSlot(""); }}
                      className={`flex-shrink-0 px-3 py-2 rounded-xl border-2 text-center transition-all ${
                        selectedDate === d.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <p className="text-xs font-medium">{d.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Time slots */}
            {selectedDate && (selectedStaff || anyStaff) && (
              <div>
                <p className="text-sm font-medium mb-2">Saat Seçin</p>
                {loadingSlots ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Müsait saatler yükleniyor...</span>
                  </div>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-3">Bu tarihte müsait saat yok.</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {slots.map((slot) => (
                      <button
                        key={slot}
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                          selectedSlot === slot ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50"
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedSlot && (
              <Button className="w-full" onClick={() => setStep(2)}>
                Devam Et <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        )}

        {/* Step 2: Contact info */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setStep(1)} className="p-1 hover:bg-accent rounded-lg transition-colors">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="text-xl font-bold">Bilgilerinizi Girin</h2>
            </div>

            {/* Summary */}
            <div className="p-4 rounded-xl bg-muted/50 space-y-1.5 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{selectedDate && format(new Date(selectedDate + "T12:00:00"), "d MMMM yyyy, EEEE", { locale: tr })}</span>
                <Clock className="h-4 w-4 ml-2" />
                <span className="font-semibold text-foreground">{selectedSlot}</span>
              </div>
              <p><span className="text-muted-foreground">Hizmet:</span> {selectedService?.name}</p>
              <p><span className="text-muted-foreground">Personel:</span> {anyStaff ? "Otomatik atanacak" : selectedStaff?.full_name}</p>
              <p className="font-bold text-primary">₺{Number(selectedService?.price || 0).toLocaleString("tr-TR")}</p>
            </div>

            <div className="space-y-3">
              <div>
                <Label>Adınız Soyadınız *</Label>
                <Input
                  placeholder="Ad Soyad"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Telefon *</Label>
                <Input
                  type="tel"
                  placeholder="05xx xxx xxxx"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>E-posta (opsiyonel)</Label>
                <Input
                  type="email"
                  placeholder="ornek@mail.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Not (opsiyonel)</Label>
                <Input
                  placeholder="Özel istek veya notunuz..."
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="space-y-2 p-3 rounded-xl bg-muted/50">
              <label className="flex items-start gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={kvkkAccepted}
                  onChange={(e) => setKvkkAccepted(e.target.checked)}
                />
                <span>
                  <button type="button" className="text-primary underline" onClick={(e) => { e.preventDefault(); setShowKvkkText((v) => !v); }}>
                    KVKK Aydınlatma Metni
                  </button>
                  {"'ni okudum, onaylıyorum. *"}
                </span>
              </label>
              {showKvkkText && (
                <p className="text-[11px] text-muted-foreground border-t pt-2">
                  {renderKvkkNotice(org.kvkk_notice_text, org.name)}
                </p>
              )}
              <label className="flex items-start gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={marketingAccepted}
                  onChange={(e) => setMarketingAccepted(e.target.checked)}
                />
                <span>Kampanya ve fırsatlardan haberdar olmak istiyorum (opsiyonel)</span>
              </label>
            </div>

            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={!form.name || !form.phone || !kvkkAccepted || submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Randevuyu Onayla
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Randevunuz anında onaylanacak. WhatsApp hatırlatması gönderilecek.
            </p>
          </div>
        )}
      </div>

      {/* Powered by */}
      <div className="text-center py-4">
        <a href="https://bysirius.com" className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">
          Siriplan ile güçlendirilmiştir · BY Sirius Group
        </a>
      </div>
    </div>
  );
}
