"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Save, ShieldCheck, Check, X, Palette, LayoutGrid, Compass } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GlassCard3D } from "@/components/ui/GlassCard3D";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";
import { PERM_KEYS, hasPermission } from "@/lib/permissions";

interface Props {
  initial: {
    full_name: string;
    phone: string;
    address: string;
    preferred_language: string;
  };
  role: string;
  orgName: string;
  email: string;
  permissionsJson: Record<string, boolean> | null;
}

function Section({ icon: Icon, title, children }: { icon: typeof Save; title: string; children: React.ReactNode }) {
  return (
    <GlassCard3D className="glass-card" glow intensity={3}>
      <div className="panel-header">
        <span className="flex items-center gap-2 text-[13px] font-bold tracking-wider uppercase text-primary">
          <Icon className="h-4 w-4" />
          {title}
        </span>
      </div>
      <div className="px-4 py-3.5 space-y-3">{children}</div>
    </GlassCard3D>
  );
}

export function AccountProfileForm({ initial, role, orgName, email, permissionsJson }: Props) {
  const t = useTranslations("dashboard.account");
  const tp = useTranslations("dashboard.permissions");
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  const roleLabel =
    role === "owner" ? t("roleOwner") : role === "manager" ? t("roleManager") : t("roleStaff");

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? t("saveFailed"));
        setSaving(false);
        return;
      }
      toast.success(t("saved"));
      // Dil değiştiyse çerez sunucuda yazıldı — paneli o dilde yeniden yükle.
      if (data.locale && data.locale !== initial.preferred_language) {
        setTimeout(() => window.location.reload(), 600);
        return;
      }
      setSaving(false);
    } catch {
      toast.error(t("saveFailed"));
      setSaving(false);
    }
  }

  const member = { role, permissions_json: permissionsJson };

  return (
    <div className="space-y-4">
      <Section icon={Save} title={t("basicTitle")}>
        <p className="text-xs text-muted-foreground -mt-1">{t("basicDesc")}</p>
        <div>
          <Label className="text-xs">{t("fullName")}</Label>
          <Input
            className="mt-1"
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">{t("phone")}</Label>
            <Input
              className="mt-1"
              type="tel"
              placeholder="05xx xxx xx xx"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <div>
            <Label className="text-xs">{t("language")}</Label>
            <Select
              value={form.preferred_language || "tr"}
              onValueChange={(v) => setForm((f) => ({ ...f, preferred_language: v ?? "tr" }))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    {l.flag} {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label className="text-xs">{t("address")}</Label>
          <Input
            className="mt-1"
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          />
        </div>
        <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t("save")}
        </Button>
      </Section>

      <Section icon={ShieldCheck} title={t("membershipTitle")}>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("business")}</span>
          <span className="font-semibold">{orgName}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("role")}</span>
          <span className="font-semibold">{roleLabel}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("email")}</span>
          <span className="font-medium text-xs break-all">{email}</span>
        </div>

        <div className="pt-2">
          <p className="text-xs font-semibold text-foreground mb-1.5">{t("permsTitle")}</p>
          <p className="text-[11px] text-muted-foreground mb-2">{t("permsDesc")}</p>
          <ul className="space-y-1">
            {PERM_KEYS.map((key) => {
              const allowed = hasPermission(member, key);
              return (
                <li key={key} className="flex items-center gap-2 text-xs">
                  {allowed ? (
                    <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
                  ) : (
                    <X className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                  )}
                  <span className={allowed ? "text-foreground" : "text-muted-foreground/60 line-through"}>
                    {tp(key)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </Section>

      <Section icon={Palette} title={t("personalizeTitle")}>
        <p className="text-xs text-muted-foreground -mt-1">{t("personalizeDesc")}</p>
        <div className="flex flex-col gap-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-lg border border-border p-2.5 text-sm hover:bg-accent/50 transition-colors"
          >
            <LayoutGrid className="h-4 w-4 text-primary" />
            {t("widgetsLink")}
          </Link>
          <p className="flex items-center gap-2 rounded-lg border border-border p-2.5 text-sm text-muted-foreground">
            <Palette className="h-4 w-4 text-primary" />
            {t("themeHint")}
          </p>
          <Link
            href={role === "staff" ? "/dashboard?tour=1" : "/dashboard/ayarlar?tour=1"}
            className="flex items-center gap-2 rounded-lg border border-border p-2.5 text-sm hover:bg-accent/50 transition-colors"
          >
            <Compass className="h-4 w-4 text-primary" />
            {t("restartTour")}
          </Link>
        </div>
      </Section>
    </div>
  );
}
