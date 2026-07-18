"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Scissors, AlertTriangle, Bell } from "lucide-react";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";

const DAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

interface StaffService {
  service_id: string;
  services: { id: string; name: string; price: number; duration_minutes: number } | null;
}

interface StaffData {
  id: string;
  full_name: string;
  role: string;
  phone: string | null;
  email: string | null;
  commission_rate: number;
  start_time: string;
  end_time: string;
  working_days: number[];
  is_active: boolean;
  avatar_url?: string | null;
  telegram_chat_id?: string | null;
  whatsapp_number?: string | null;
  preferred_language?: string | null;
  color?: string | null;
  staff_services?: StaffService[];
}

// Takvimde kullanılan palet ile aynı tonlar
const CALENDAR_COLORS = [
  "#6366f1", "#ec4899", "#10b981", "#f59e0b", "#06b6d4",
  "#8b5cf6", "#ef4444", "#84cc16", "#f97316", "#14b8a6",
];

export default function PersonelDetayPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [staff, setStaff] = useState<StaffData | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    role: "",
    phone: "",
    email: "",
    commission_rate: "0",
    start_time: "09:00",
    end_time: "18:00",
    working_days: [] as number[],
    telegram_chat_id: "",
    whatsapp_number: "",
    preferred_language: "",
    color: "",
  });

  useEffect(() => {
    fetch(`/api/staff/${id}`)
      .then((r) => r.json())
      .then(({ staff: s }) => {
        if (!s) { toast.error("Personel bulunamadı"); router.push("/dashboard/personel"); return; }
        setStaff(s);
        setForm({
          full_name: s.full_name,
          role: s.role || "",
          phone: s.phone || "",
          email: s.email || "",
          commission_rate: String(Math.round((s.commission_rate || 0) * 100)),
          start_time: s.start_time || "09:00",
          end_time: s.end_time || "18:00",
          working_days: s.working_days || [],
          telegram_chat_id: s.telegram_chat_id || "",
          whatsapp_number: s.whatsapp_number || "",
          preferred_language: s.preferred_language || "",
          color: s.color || "",
        });
      })
      .catch(() => toast.error("Yüklenemedi"))
      .finally(() => setLoading(false));
  }, [id, router]);

  function toggleDay(d: number) {
    setForm((f) => ({
      ...f,
      working_days: f.working_days.includes(d)
        ? f.working_days.filter((x) => x !== d)
        : [...f.working_days, d].sort(),
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim()) return toast.error("İsim zorunlu");
    setSaving(true);
    const res = await fetch(`/api/staff/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        commission_rate: (parseFloat(form.commission_rate) || 0) / 100,
        telegram_chat_id: form.telegram_chat_id || null,
        whatsapp_number: form.whatsapp_number || null,
        preferred_language: form.preferred_language || null,
        color: form.color || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Kaydedildi");
      router.refresh();
    } else {
      const err = await res.json();
      toast.error(err.error || "Hata oluştu");
    }
  }

  async function handleDeactivate() {
    if (!confirm(`${staff?.full_name} pasife alınacak. Emin misiniz?`)) return;
    startTransition(async () => {
      const res = await fetch(`/api/staff/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Personel pasife alındı");
        router.push("/dashboard/personel");
        router.refresh();
      } else {
        const err = await res.json();
        toast.error(err.error || "Hata oluştu");
      }
    });
  }

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!staff) return null;

  return (
    <div className="p-6 max-w-xl mx-auto space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/dashboard/personel" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-fuchsia-200 dark:from-primary/30 dark:to-fuchsia-900 flex items-center justify-center text-lg font-bold text-primary shrink-0">
            {staff.full_name[0]}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold truncate">{staff.full_name}</h1>
            <p className="text-xs text-muted-foreground">{staff.role}</p>
          </div>
        </div>
        {!staff.is_active && (
          <Badge variant="outline" className="text-amber-600 border-amber-300 shrink-0">Pasif</Badge>
        )}
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Personel Bilgileri</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Ad Soyad *</Label>
                <Input
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  placeholder="Personel adı"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Unvan / Rol</Label>
                <Input
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  placeholder="Uzman, Asistan..."
                />
              </div>
              <div className="space-y-1">
                <Label>Komisyon (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={form.commission_rate}
                  onChange={(e) => setForm((f) => ({ ...f, commission_rate: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Telefon</Label>
                <Input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="05xx..."
                />
              </div>
              <div className="space-y-1">
                <Label>E-posta</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="personel@..."
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Tercih Edilen Dil</Label>
                <select
                  value={form.preferred_language}
                  onChange={(e) => setForm((f) => ({ ...f, preferred_language: e.target.value }))}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Belirtilmedi</option>
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.flag} {l.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Personel giriş yaptığında panel bu dilde açılır.
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <Label className="text-sm font-medium">Takvim Rengi</Label>
              <p className="text-xs text-muted-foreground">
                Bu personelin randevuları takvimde bu renkle gösterilir.
              </p>
              <div className="flex gap-2 flex-wrap items-center">
                {CALENDAR_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, color: f.color === c ? "" : c }))}
                    title={c}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${
                      form.color === c ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                    }`}
                    style={{ background: c }}
                  />
                ))}
                {form.color === "" && (
                  <span className="text-[11px] text-muted-foreground">Otomatik (sıraya göre)</span>
                )}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <Label className="text-sm font-medium">Çalışma Saatleri</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Başlangıç</Label>
                  <Input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Bitiş</Label>
                  <Input
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Bell className="h-3.5 w-3.5 text-primary" />
                Bildirim Kanalları
              </Label>
              <p className="text-xs text-muted-foreground">
                Doldurulan her kanaldan otomatik randevu bildirimi gönderilir.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Telegram Chat ID</Label>
                  <Input
                    value={form.telegram_chat_id}
                    onChange={(e) => setForm((f) => ({ ...f, telegram_chat_id: e.target.value }))}
                    placeholder="123456789"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">WhatsApp Numarası</Label>
                  <Input
                    type="tel"
                    value={form.whatsapp_number}
                    onChange={(e) => setForm((f) => ({ ...f, whatsapp_number: e.target.value }))}
                    placeholder="905xxxxxxxxx"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Çalışma Günleri</Label>
              <div className="flex gap-2">
                {DAYS.map((day, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i + 1)}
                    className={`flex-1 py-1.5 text-xs rounded-md border font-medium transition-colors ${
                      form.working_days.includes(i + 1)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Kaydet
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Services */}
      {staff.staff_services && staff.staff_services.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Scissors className="h-4 w-4 text-primary" />
              Sunulan Hizmetler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {staff.staff_services.map((ss) =>
                ss.services ? (
                  <Badge key={ss.service_id} variant="secondary" className="text-xs py-1 px-2.5">
                    {ss.services.name}
                    <span className="ml-1.5 text-muted-foreground">
                      ₺{Number(ss.services.price).toLocaleString("tr-TR")} · {ss.services.duration_minutes}dk
                    </span>
                  </Badge>
                ) : null
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Hizmet atamalarını değiştirmek için{" "}
              <Link href="/dashboard/hizmetler" className="text-primary underline">
                Hizmetler
              </Link>{" "}
              sayfasını kullanın.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Danger zone */}
      {staff.is_active && (
        <Card className="border-0 shadow-sm border-red-100 dark:border-red-900/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-4 w-4" />
              Tehlikeli Alan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Personeli pasife almak onun yeni randevulara atanmasını engeller. Mevcut randevular etkilenmez.
            </p>
            <Button
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
              onClick={handleDeactivate}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Pasife Al
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
