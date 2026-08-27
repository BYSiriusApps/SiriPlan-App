"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Mail, Send, Copy, CheckCircle2, UserPlus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PERM_KEYS, DEFAULT_PERMS, OWNER_ONLY_PERMS } from "@/lib/permissions";

interface StaffOption {
  id: string;
  full_name: string;
}

interface Props {
  staffList: StaffOption[];
  /** Belirli bir personel için önceden seçilmiş davet (personel detay sayfasından açılışta) */
  preselectedStaffId?: string;
  /** Sahip değilse (yalnızca manage_staff verilmiş yönetici) yetki devri kısıtlanır. */
  viewerIsOwner?: boolean;
}

export function StaffInviteDialog({ staffList, preselectedStaffId, viewerIsOwner = false }: Props) {
  const t = useTranslations("dashboard.staffInvite");
  const tp = useTranslations("dashboard.permissions");
  const tsp = useTranslations("dashboard.staffPermissions");
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"form" | "success">("form");
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    staff_id: preselectedStaffId ?? "",
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
      toast.error(t("errorContactRequired"));
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
      toast.error(data.error ?? t("errorGeneric"));
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

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setStep("form");
      setForm({ staff_id: preselectedStaffId ?? "", email: "", phone: "", role: "staff", permissions: { ...DEFAULT_PERMS.staff } });
      setInviteUrl("");
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <UserPlus className="h-3.5 w-3.5" />
        {t("inviteButton")}
      </Button>

      {/*
        Base UI Dialog gövdeye portal edilir. Eski sürümde elle yazılmış
        `fixed inset-0` katman kullanılıyordu; panel sayfalarını saran
        .animate-route-fade wrapper'ı transform taşıdığı için o katman ekrana
        değil sayfa gövdesine göre konumlanıyor ve modal ekranın dışında
        açılıyordu (bkz. globals.css route-fade notu).
      */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              {t("dialogTitle")}
            </DialogTitle>
            <DialogDescription className="text-xs">{t("dialogDesc")}</DialogDescription>
          </DialogHeader>

          {step === "success" ? (
            <div className="space-y-4">
              <div className="text-center">
                <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2" />
                <p className="font-medium">{t("successTitle")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("successDesc")}</p>
              </div>
              <div className="flex gap-2">
                <Input value={inviteUrl} readOnly className="text-xs" />
                <Button variant="outline" size="icon" onClick={copyLink}>
                  {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <Button className="w-full" onClick={() => handleOpenChange(false)}>{t("closeButton")}</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {staffList.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs">{t("linkExistingLabel")}</Label>
                  <Select value={form.staff_id} onValueChange={(v) => setForm((f) => ({ ...f, staff_id: (v ?? "") === "_none" ? "" : (v ?? "") }))}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder={t("linkPlaceholder")}>
                        {(value: string) =>
                          !value || value === "_none"
                            ? t("linkPlaceholder")
                            : staffList.find((s) => s.id === value)?.full_name || t("linkPlaceholder")
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">{t("linkNoneOption")}</SelectItem>
                      {staffList.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1"><Mail className="h-3 w-3" />{t("emailLabel")}</Label>
                  <Input
                    type="email"
                    placeholder={t("emailPlaceholder")}
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("phoneLabel")}</Label>
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
                <Label className="text-xs">{tsp("roleLabel")}</Label>
                <Select value={form.role} onValueChange={(v) => handleRoleChange(v as "staff" | "manager")}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">{tsp("roleStaff")}</SelectItem>
                    {viewerIsOwner && <SelectItem value="manager">{tsp("roleManager")}</SelectItem>}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 pt-1 border-t">
                <Label className="text-xs font-medium">{tsp("permissionsLabel")}</Label>
                <PermissionChecklist
                  permissions={form.permissions}
                  onToggle={togglePerm}
                  viewerIsOwner={viewerIsOwner}
                  label={tp}
                  idPrefix="invite"
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  {t("cancelButton")}
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Send className="h-3.5 w-3.5 mr-1" />}
                  {t("sendButton")}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * İzin listesi — davet dialogu ve personel detay sayfası aynı görünümü
 * paylaşır. Eskiden ham `<input type="checkbox">` kullanılıyordu; panelin
 * geri kalanı Checkbox bileşenini kullandığı için koyu temada ve mobilde
 * tutarsız görünüyordu.
 */
export function PermissionChecklist({
  permissions,
  onToggle,
  viewerIsOwner,
  label,
  idPrefix,
  disabled = false,
}: {
  permissions: Record<string, boolean>;
  onToggle: (key: string) => void;
  viewerIsOwner: boolean;
  label: (key: string) => string;
  idPrefix: string;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
      {PERM_KEYS.map((key) => {
        // manage_staff yalnızca işletme sahibi tarafından devredilebilir.
        const locked = disabled || (OWNER_ONLY_PERMS.has(key) && !viewerIsOwner);
        if (locked && !permissions[key] && OWNER_ONLY_PERMS.has(key)) return null;
        const id = `${idPrefix}-perm-${key}`;
        return (
          <div key={key} className="flex items-start gap-2">
            <Checkbox
              id={id}
              checked={!!permissions[key]}
              disabled={locked}
              onCheckedChange={() => onToggle(key)}
              className="mt-0.5 shrink-0"
            />
            <label
              htmlFor={id}
              className={`text-xs leading-snug ${locked ? "text-muted-foreground/60" : "cursor-pointer text-muted-foreground hover:text-foreground transition-colors"}`}
            >
              {label(key)}
            </label>
          </div>
        );
      })}
    </div>
  );
}
