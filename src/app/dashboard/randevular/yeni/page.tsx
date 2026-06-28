"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { Staff, Service } from "@/types/database";

export default function YeniRandevuPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [orgId, setOrgId] = useState<string>("");

  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    staff_id: "",
    service_id: "",
    appointment_at: "",
    note: "",
    source: "yuzyuze" as const,
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/staff").then((r) => r.json()),
      fetch("/api/services").then((r) => r.json()),
      fetch("/api/org").then((r) => r.json()),
    ])
      .then(([staffData, servicesData, orgData]) => {
        setStaff(staffData.staff || []);
        setServices(servicesData.services || []);
        setOrgId(orgData.org?.id || "");
      })
      .catch(() => toast.error("Veriler yüklenemedi"))
      .finally(() => setDataLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.staff_id || !form.service_id || !form.appointment_at) {
      return toast.error("Personel, hizmet ve tarih/saat zorunlu");
    }

    setLoading(true);
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, org_id: orgId }),
    });
    setLoading(false);

    if (res.ok) {
      const data = await res.json();
      toast.success("Randevu oluşturuldu");
      router.push(`/dashboard/randevular/${data.appointment.id}`);
    } else {
      const err = await res.json();
      toast.error(err.error || "Hata oluştu");
    }
  }

  const now = new Date();
  const minDate = now.toISOString().slice(0, 16);

  return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/randevular" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Yeni Randevu</h1>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Randevu Bilgileri</CardTitle>
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
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1">
                    <Label>Ad Soyad *</Label>
                    <Input
                      value={form.customer_name}
                      onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))}
                      placeholder="Müşteri adı"
                      required
                    />
                  </div>
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

              {/* Appointment */}
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
                          {s.name} — ₺{Number(s.price).toLocaleString("tr-TR")} ({s.duration_minutes}dk)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Tarih & Saat *</Label>
                  <Input
                    type="datetime-local"
                    min={minDate}
                    value={form.appointment_at}
                    onChange={(e) => setForm((f) => ({ ...f, appointment_at: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label>Kaynak</Label>
                  <Select value={form.source} onValueChange={(v) => setForm((f) => ({ ...f, source: v as typeof form.source }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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
                Randevu Oluştur
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
