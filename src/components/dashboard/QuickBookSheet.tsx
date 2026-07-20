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
import { Plus, Search, User, Scissors, Clock, Phone, Star, Loader2, X, Check, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { DateTimeSlotPicker, nextSlot } from "@/components/dashboard/DateTimeSlotPicker";
import { renderWaTemplate, waMessageLink } from "@/lib/wa-template";

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
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

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
  const [orgName, setOrgName] = useState("");
  const [waTemplate, setWaTemplate] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/org")
      .then((r) => r.json())
      .then((d) => {
        setOrgName(d.org?.name ?? "");
        const s = (d.org?.settings_json ?? {}) as Record<string, unknown>;
        setWaTemplate(typeof s.wa_appointment_template === "string" ? s.wa_appointment_template : null);
      })
      .catch(() => {});
  }, []);

  // Reset on open
  useEffect(() => {
    if (open) {
      setSelectedStaffId(preselectedStaffId ?? "");
      setSelectedServiceId("");
      setAppointmentAt(nextSlot(preselectedDate));
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStaffId) { toast.error("Personel seçiniz"); return; }
    if (!selectedServiceId) { toast.error("Hizmet seçiniz"); return; }
    if (!customerName.trim()) { toast.error("Müşteri adı gerekli"); return; }
    if (!customerPhone.trim()) { toast.error("Müşteri telefonu gerekli"); return; }
    if (!appointmentAt) { toast.error("Tarih/saat gerekli"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: orgId,
          staff_id: selectedStaffId,
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
        toast.error(json.error ?? "Randevu oluşturulamadı");
        return;
      }

      toast.success("Randevu oluşturuldu!");

      // Hazır mesajla müşterinin WhatsApp sohbetini aç (tek dokunuşla gönderilir)
      if (sendWaMessage && customerPhone.trim()) {
        const text = renderWaTemplate(waTemplate, {
          musteri: customerName.trim(),
          salon: orgName || "Salonumuz",
          appointmentAt,
          hizmet: selectedService?.name,
          personel: staff.find((s) => s.id === selectedStaffId)?.full_name,
        });
        window.open(waMessageLink(customerPhone.trim(), text), "_blank", "noopener");
      }

      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={
        <Button size="sm" className="gap-1.5" />
      }>
        <Plus className="h-4 w-4" />
        Randevu Ekle
      </SheetTrigger>

      <SheetContent side="right" className="overflow-y-auto p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b sticky top-0 bg-background z-10">
          <SheetTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            Hızlı Randevu
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6">

          {/* ── Staff picker ── */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <User className="h-3.5 w-3.5" /> Personel
            </Label>
            <div className="grid grid-cols-2 gap-2">
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
              <Search className="h-3.5 w-3.5" /> Müşteri
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
                    placeholder="İsim veya telefon ara..."
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
                                {c.total_visits} ziyaret
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
                  <Label className="text-xs text-muted-foreground mb-1 block">Telefon *</Label>
                  <Input
                    placeholder="05xx xxx xx xx"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    type="tel"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">E-posta</Label>
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
              <Scissors className="h-3.5 w-3.5" /> Hizmet
            </Label>
            <Select value={selectedServiceId} onValueChange={(v) => setSelectedServiceId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Hizmet seçin..." />
              </SelectTrigger>
              <SelectContent>
                {services.map((svc) => (
                  <SelectItem key={svc.id} value={svc.id}>
                    <span className="flex items-center gap-2">
                      {svc.name}
                      <Badge variant="outline" className="text-[10px] ml-1">
                        ₺{Number(svc.price).toLocaleString("tr-TR")} · {svc.duration_minutes}dk
                      </Badge>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedService && (
              <div className="flex gap-4 text-xs text-muted-foreground px-1">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{selectedService.duration_minutes} dk</span>
                <span>₺{Number(selectedService.price).toLocaleString("tr-TR")}</span>
              </div>
            )}
          </div>

          {/* ── Date & time — 15 dakikalık slotlar ── */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tarih ve Saat</Label>
            <DateTimeSlotPicker
              value={appointmentAt}
              onChange={setAppointmentAt}
              minDate={new Date().toISOString().slice(0, 10)}
            />
          </div>

          {/* ── Note ── */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Not (isteğe bağlı)</Label>
            <Input
              placeholder="Özel istek, not..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {/* ── Otomatik WhatsApp mesajı ── */}
          <label className="flex items-start gap-3 p-3 rounded-xl border border-green-200 dark:border-green-900/50 bg-green-50/60 dark:bg-green-950/20 cursor-pointer">
            <input
              type="checkbox"
              checked={sendWaMessage}
              onChange={(e) => setSendWaMessage(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-green-600 shrink-0"
            />
            <span className="min-w-0">
              <span className="text-sm font-medium flex items-center gap-1.5">
                <MessageCircle className="h-3.5 w-3.5 text-green-600" />
                Müşteriye WhatsApp mesajı gönder
              </span>
              <span className="block text-xs text-muted-foreground mt-0.5">
                Kaydedince hazır bilgilendirme metniyle WhatsApp açılır.
              </span>
            </span>
          </label>

          {/* ── Submit ── */}
          <div className="pt-2 border-t">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Randevu Oluştur
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
