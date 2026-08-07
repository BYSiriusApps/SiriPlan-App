"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { Staff, Service } from "@/types/database";
import { DateTimeSlotPicker, toLocalDateTimeValue } from "@/components/dashboard/DateTimeSlotPicker";

export default function RandevuDuzenlePage() {
  const t = useTranslations("dashboard");
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    staff_id: "",
    service_id: "",
    appointment_at: "",
    note: "",
    source: "yuzyuze",
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/appointments/${id}`).then((r) => r.json()),
      fetch("/api/staff").then((r) => r.json()),
      fetch("/api/services").then((r) => r.json()),
    ])
      .then(([apptData, staffData, servicesData]) => {
        const a = apptData.appointment;
        if (!a) { toast.error("Randevu bulunamadı"); return; }
        setForm({
          customer_name: a.customer_name ?? "",
          customer_phone: a.customer_phone ?? "",
          customer_email: a.customer_email ?? "",
          staff_id: a.staff_id ?? "",
          service_id: a.service_id ?? "",
          // UTC ISO'yu YEREL "yyyy-MM-ddTHH:mm" değerine çevir (slice tz kaydırıyordu)
          appointment_at: a.appointment_at ? toLocalDateTimeValue(new Date(a.appointment_at)) : "",
          note: a.note ?? "",
          source: a.source ?? "yuzyuze",
        });
        setStaff(staffData.staff || []);
        setServices(servicesData.services || []);
      })
      .catch(() => toast.error("Veriler yüklenemedi"))
      .finally(() => setDataLoading(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.staff_id || !form.service_id || !form.appointment_at) {
      return toast.error("Personel, hizmet ve tarih/saat zorunlu");
    }
    setLoading(true);
    const res = await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        appointment_at: new Date(form.appointment_at).toISOString(),
      }),
    });
    setLoading(false);
    if (res.ok) {
      toast.success("Randevu güncellendi");
      router.push(`/dashboard/randevular/${id}`);
    } else {
      const err = await res.json();
      toast.error(err.error || "Hata oluştu");
    }
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/dashboard/randevular/${id}`} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold brand-gradient-text">{t("apptEdit.title")}</h1>
      </div>

      <Card className="kpi-tile border-0 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("apptEdit.cardTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {dataLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-3 pb-3 border-b">
                <p className="text-sm font-medium text-muted-foreground">Müşteri Bilgileri</p>
                <div className="space-y-1">
                  <Label>Ad Soyad *</Label>
                  <Input
                    value={form.customer_name}
                    onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))}
                    placeholder="Müşteri adı"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Telefon *</Label>
                    <Input
                      type="tel"
                      value={form.customer_phone}
                      onChange={(e) => setForm((f) => ({ ...f, customer_phone: e.target.value }))}
                      placeholder="05xx..."
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>E-posta</Label>
                    <Input
                      type="email"
                      value={form.customer_email}
                      onChange={(e) => setForm((f) => ({ ...f, customer_email: e.target.value }))}
                      placeholder="opsiyonel"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Randevu Detayları</p>

                <div className="space-y-1">
                  <Label>Personel *</Label>
                  <Select value={form.staff_id} onValueChange={(v) => v && setForm((f) => ({ ...f, staff_id: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Personel seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {staff.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Hizmet *</Label>
                  <Select value={form.service_id} onValueChange={(v) => v && setForm((f) => ({ ...f, service_id: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Hizmet seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} — {s.duration_minutes}dk · ₺{Number(s.price).toLocaleString("tr-TR")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Tarih & Saat * <span className="text-[10px] text-muted-foreground">(15 dk aralıklarla)</span></Label>
                  <DateTimeSlotPicker
                    value={form.appointment_at}
                    onChange={(v) => setForm((f) => ({ ...f, appointment_at: v }))}
                  />
                </div>

                <div className="space-y-1">
                  <Label>Kaynak</Label>
                  <Select value={form.source} onValueChange={(v) => setForm((f) => ({ ...f, source: v ?? "yuzyuze" }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yuzyuze">Yüz yüze</SelectItem>
                      <SelectItem value="telefon">Telefon</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="web">Web</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Not</Label>
                  <Input
                    value={form.note}
                    onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                    placeholder="Opsiyonel not..."
                  />
                </div>
              </div>

              <Button type="submit" className="w-full mt-2" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {t("apptEdit.submitButton")}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
