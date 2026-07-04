"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Mail, Send, Copy, CheckCircle2, UserPlus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface StaffOption {
  id: string;
  full_name: string;
}

interface Props {
  staffList: StaffOption[];
}

const PERM_LABELS: Record<string, string> = {
  view_customers:      "Müşterileri görsün",
  edit_customers:      "Müşterileri düzenleyebilsin",
  view_reports:        "Raporları görsün",
  edit_services:       "Hizmetleri düzenleyebilsin",
  manage_staff:        "Personeli yönetebilsin",
  view_financials:     "Gelir/gideri görsün",
  manage_campaigns:    "Kampanyaları yönetebilsin",
  create_appointments: "Randevu oluşturabilsin",
  edit_appointments:   "Randevu düzenleyebilsin",
  cancel_appointments: "Randevu iptal edebilsin",
};

const DEFAULT_PERMS: Record<string, Record<string, boolean>> = {
  staff: {
    view_customers: true, edit_customers: false, view_reports: false,
    edit_services: false, manage_staff: false, view_financials: false,
    manage_campaigns: false, create_appointments: true, edit_appointments: true,
    cancel_appointments: false,
  },
  manager: {
    view_customers: true, edit_customers: true, view_reports: true,
    edit_services: true, manage_staff: false, view_financials: true,
    manage_campaigns: true, create_appointments: true, edit_appointments: true,
    cancel_appointments: true,
  },
};

export function StaffInviteDialog({ staffList }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"form" | "success">("form");
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    staff_id: "",
    email: "",
    phone: "",
    role: "staff" as "staff" | "manager",
    permissions: { ...DEFAULT_PERMS.staff },
  });

  function handleRoleChange(role: "staff" | "manager") {
    setForm((f) => ({ ...f, role, permissions: { ...DEFAULT_PERMS[role] } }));
  }

  function togglePerm(key: string) {
    setForm((f) => ({
      ...f,
      permissions: { ...f.permissions, [key]: !f.permissions[key] },
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email && !form.phone) {
      toast.error("E-posta veya telefon zorunlu");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/staff/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        staff_id: form.staff_id || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        role: form.role,
        permissions_json: form.permissions,
      }),
    });
    setLoading(false);
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Hata oluştu");
      return;
    }
    setInviteUrl(data.invite_url);
    setStep("success");
  }

  function copyLink() {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function reset() {
    setStep("form");
    setForm({ staff_id: "", email: "", phone: "", role: "staff", permissions: { ...DEFAULT_PERMS.staff } });
    setInviteUrl("");
    setOpen(false);
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <UserPlus className="h-3.5 w-3.5" />
        Personel Davet Et
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => reset()}>
      <div
        className="bg-background border rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            Personel Davet Et
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Davet linki ile personel kendi hesabını oluşturup işletmenize katılır.
          </p>
        </div>

        {step === "success" ? (
          <div className="p-5 space-y-4">
            <div className="text-center">
              <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2" />
              <p className="font-medium">Davet oluşturuldu!</p>
              <p className="text-xs text-muted-foreground mt-1">
                Personele bildirim gönderildi. Ayrıca aşağıdaki linki de iletebilirsiniz.
              </p>
            </div>
            <div className="flex gap-2">
              <Input value={inviteUrl} readOnly className="text-xs" />
              <Button variant="outline" size="icon" onClick={copyLink}>
                {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <Button className="w-full" onClick={reset}>Kapat</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {staffList.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">Mevcut Personel Kaydına Bağla (opsiyonel)</Label>
                <Select value={form.staff_id} onValueChange={(v) => setForm((f) => ({ ...f, staff_id: (v ?? "") === "_none" ? "" : (v ?? "") }))}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Seçin veya boş bırakın" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— Bağlamadan devam et —</SelectItem>
                    {staffList.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1"><Mail className="h-3 w-3" />E-posta</Label>
                <Input
                  type="email"
                  placeholder="personel@..."
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">WhatsApp / Telefon</Label>
                <Input
                  type="tel"
                  placeholder="905xxxxxxxxx"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Rol</Label>
              <Select value={form.role} onValueChange={(v) => handleRoleChange(v as "staff" | "manager")}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Personel — Temel erişim</SelectItem>
                  <SelectItem value="manager">Yönetici — Genişletilmiş erişim</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 pt-1 border-t">
              <Label className="text-xs font-medium">İzinler</Label>
              <div className="grid grid-cols-1 gap-1.5">
                {Object.entries(PERM_LABELS).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={!!form.permissions[key]}
                      onChange={() => togglePerm(key)}
                      className="rounded text-primary"
                    />
                    <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={reset}>
                İptal
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Send className="h-3.5 w-3.5 mr-1" />}
                Davet Gönder
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
