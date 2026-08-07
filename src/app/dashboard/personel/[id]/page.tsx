"use client";

import { useState, useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Scissors, AlertTriangle, Bell, ShieldCheck, Activity, CalendarX, Trash2 } from "lucide-react";
import type { StaffTimeOff } from "@/types/database";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";
import { PERM_KEYS, DEFAULT_PERMS } from "@/lib/permissions";
import { STATUS_LABELS, STATUS_BADGE_CLASSES } from "@/lib/appointment-status";
import { StaffInviteDialog } from "@/components/dashboard/StaffInviteDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

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
  const t = useTranslations("dashboard.staffPermissions");
  const tp = useTranslations("dashboard.permissions");
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [staff, setStaff] = useState<StaffData | null>(null);

  // Giriş hesabı yetkileri (org_members.role + permissions_json)
  const [permsLoading, setPermsLoading] = useState(true);
  const [permsSaving, setPermsSaving] = useState(false);
  const [linked, setLinked] = useState(false);
  const [memberRole, setMemberRole] = useState<"staff" | "manager">("staff");
  const [perms, setPerms] = useState<Record<string, boolean>>(DEFAULT_PERMS.staff);
  const [viewerRole, setViewerRole] = useState<string>("staff");
  const [viewerCanManageStaff, setViewerCanManageStaff] = useState(false);

  useEffect(() => {
    fetch(`/api/staff/${id}/permissions`)
      .then((r) => r.json())
      .then((d) => {
        setLinked(!!d.linked);
        setViewerRole(d.viewerRole ?? "staff");
        setViewerCanManageStaff(!!d.viewerPermissions?.manage_staff);
        if (d.linked) {
          setMemberRole(d.role === "manager" ? "manager" : "staff");
          setPerms({ ...DEFAULT_PERMS[d.role === "manager" ? "manager" : "staff"], ...(d.permissions_json ?? {}) });
        }
      })
      .catch(() => {})
      .finally(() => setPermsLoading(false));
  }, [id]);

  // Randevu istatistikleri + durum değişikliği geçmişi (audit log)
  interface ActivityHistoryEntry {
    id: string;
    created_at: string;
    old_data: { status?: string } | null;
    new_data: { status?: string; actor_name?: string } | null;
  }
  const [activity, setActivity] = useState<{ counts: Record<string, number>; history: ActivityHistoryEntry[] } | null>(null);

  useEffect(() => {
    fetch(`/api/staff/${id}/activity`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setActivity(d))
      .catch(() => {});
  }, [id]);

  // İzinler / kapalı günler
  const [timeOff, setTimeOff] = useState<StaffTimeOff[]>([]);
  const [timeOffForm, setTimeOffForm] = useState({ starts_on: "", ends_on: "", reason: "" });
  const [addingTimeOff, setAddingTimeOff] = useState(false);

  function loadTimeOff() {
    fetch(`/api/staff-time-off?staff_id=${id}`)
      .then((r) => r.json())
      .then((d) => setTimeOff(d.time_off ?? []))
      .catch(() => {});
  }
  useEffect(loadTimeOff, [id]);

  async function handleAddTimeOff(e: React.FormEvent) {
    e.preventDefault();
    if (!timeOffForm.starts_on || !timeOffForm.ends_on) return toast.error("Tarih aralığı zorunlu");
    setAddingTimeOff(true);
    const res = await fetch("/api/staff-time-off", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staff_id: id, ...timeOffForm }),
    });
    setAddingTimeOff(false);
    if (res.ok) {
      setTimeOffForm({ starts_on: "", ends_on: "", reason: "" });
      loadTimeOff();
      toast.success("İzin eklendi");
    } else {
      const err = await res.json();
      toast.error(err.error || "İzin eklenemedi");
    }
  }

  async function handleDeleteTimeOff(toId: string) {
    const res = await fetch(`/api/staff-time-off/${toId}`, { method: "DELETE" });
    if (res.ok) {
      setTimeOff((prev) => prev.filter((t) => t.id !== toId));
    } else {
      toast.error("İzin silinemedi");
    }
  }

  async function handleSavePerms() {
    setPermsSaving(true);
    const res = await fetch(`/api/staff/${id}/permissions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: memberRole, permissions_json: perms }),
    });
    setPermsSaving(false);
    if (res.ok) {
      toast.success(t("savedToast"));
    } else {
      const err = await res.json();
      toast.error(err.error || t("saveFailedToast"));
    }
  }

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
            <h1 className="text-xl font-bold brand-gradient-text truncate">{staff.full_name}</h1>
            <p className="text-xs text-muted-foreground">{staff.role}</p>
          </div>
        </div>
        {!staff.is_active && (
          <Badge variant="outline" className="text-amber-600 border-amber-300 shrink-0">Pasif</Badge>
        )}
      </div>

      <Card className="kpi-tile border-0 shadow-none">
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

      {/* Giriş hesabı yetkileri */}
      <Card className="kpi-tile border-0 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            {t("yetkilerTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {permsLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !linked ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t("noAccountText")}
                {viewerRole === "owner" || viewerCanManageStaff
                  ? t("noAccountOwnerHint")
                  : t("noAccountStaffHint")}
              </p>
              {(viewerRole === "owner" || viewerCanManageStaff) && (
                <StaffInviteDialog staffList={[]} preselectedStaffId={id} />
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs">{t("roleLabel")}</Label>
                <Select
                  value={memberRole}
                  onValueChange={(v) => {
                    const role = (v ?? "staff") as "staff" | "manager";
                    setMemberRole(role);
                    setPerms({ ...DEFAULT_PERMS[role] });
                  }}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">{t("roleStaff")}</SelectItem>
                    <SelectItem value="manager">{t("roleManager")}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  {t("roleResetHint")}
                </p>
              </div>

              <div className="space-y-1.5 pt-2 border-t">
                <Label className="text-xs font-medium">{t("permissionsLabel")}</Label>
                <div className="grid sm:grid-cols-2 gap-1.5">
                  {PERM_KEYS.map((key) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={!!perms[key]}
                        onChange={() => setPerms((p) => ({ ...p, [key]: !p[key] }))}
                        className="rounded text-primary"
                      />
                      <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                        {tp(key)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <Button size="sm" onClick={handleSavePerms} disabled={permsSaving} className="gap-1.5">
                {permsSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                {t("saveButton")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Services */}
      {staff.staff_services && staff.staff_services.length > 0 && (
        <Card className="kpi-tile border-0 shadow-none">
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

      {/* İzinler / kapalı günler */}
      <Card className="kpi-tile border-0 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarX className="h-4 w-4 text-primary" />
            İzinler
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground -mt-1">
            Bu tarih aralıklarında personel için online randevu ve panelden randevu oluşturma engellenir.
          </p>

          {timeOff.length > 0 && (
            <div className="space-y-1.5">
              {timeOff.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2 text-sm py-1.5 px-2.5 rounded-lg bg-muted/30">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {format(new Date(t.starts_on + "T12:00:00"), "d MMM yyyy", { locale: tr })}
                      {t.ends_on !== t.starts_on && ` – ${format(new Date(t.ends_on + "T12:00:00"), "d MMM yyyy", { locale: tr })}`}
                    </p>
                    {t.reason && <p className="text-xs text-muted-foreground truncate">{t.reason}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteTimeOff(t.id)}
                    className="text-muted-foreground hover:text-red-600 transition-colors shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleAddTimeOff} className="grid grid-cols-2 gap-3 pt-2 border-t">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Başlangıç</Label>
              <Input
                type="date"
                value={timeOffForm.starts_on}
                onChange={(e) => setTimeOffForm((f) => ({ ...f, starts_on: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Bitiş</Label>
              <Input
                type="date"
                value={timeOffForm.ends_on}
                onChange={(e) => setTimeOffForm((f) => ({ ...f, ends_on: e.target.value }))}
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs text-muted-foreground">Not (opsiyonel)</Label>
              <Input
                value={timeOffForm.reason}
                onChange={(e) => setTimeOffForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="Yıllık izin, rapor..."
              />
            </div>
            <Button type="submit" size="sm" className="col-span-2" disabled={addingTimeOff}>
              {addingTimeOff ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              İzin Ekle
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Activity */}
      {activity && (
        <Card className="kpi-tile border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Personel Aktiviteleri
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(["tamamlandi", "talep", "onaylandi", "gelmedi", "iptal"] as const).map((key) => (
                <div key={key} className={cn("rounded-lg border p-2.5 text-center", STATUS_BADGE_CLASSES[key])}>
                  <p className="text-lg font-bold">{activity.counts[key] ?? 0}</p>
                  <p className="text-[10px] font-medium">{STATUS_LABELS[key]}</p>
                </div>
              ))}
            </div>

            {activity.history.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground">Durum Değişikliği Geçmişi</p>
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {activity.history.map((h) => {
                    const oldStatus = h.old_data?.status ?? "";
                    const newStatus = h.new_data?.status ?? "";
                    return (
                      <div key={h.id} className="flex items-center justify-between gap-2 text-xs py-1.5 px-2 rounded-lg bg-muted/30">
                        <span className="flex items-center gap-1 flex-wrap">
                          <span className={cn("px-1.5 py-0.5 rounded", STATUS_BADGE_CLASSES[oldStatus])}>
                            {STATUS_LABELS[oldStatus] ?? oldStatus}
                          </span>
                          →
                          <span className={cn("px-1.5 py-0.5 rounded", STATUS_BADGE_CLASSES[newStatus])}>
                            {STATUS_LABELS[newStatus] ?? newStatus}
                          </span>
                        </span>
                        <span className="text-muted-foreground shrink-0">
                          {h.new_data?.actor_name ? `${h.new_data.actor_name} · ` : ""}
                          {format(new Date(h.created_at), "d MMM HH:mm", { locale: tr })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Danger zone */}
      {staff.is_active && (
        <Card className="kpi-tile border-0 shadow-none border-red-100 dark:border-red-900/30">
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
