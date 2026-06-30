"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Save, Building2, Link2, Clock, ShieldCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type { Organization } from "@/types/database";

const DAYS = [
  { key: "mon", label: "Pazartesi" },
  { key: "tue", label: "Salı" },
  { key: "wed", label: "Çarşamba" },
  { key: "thu", label: "Perşembe" },
  { key: "fri", label: "Cuma" },
  { key: "sat", label: "Cumartesi" },
  { key: "sun", label: "Pazar" },
];

const BUSINESS_TYPES = [
  { value: "kuafor", label: "Kuaför" },
  { value: "berber", label: "Berber" },
  { value: "guzellik", label: "Güzellik Merkezi" },
  { value: "spa", label: "Spa" },
  { value: "nail", label: "Nail Salon" },
  { value: "estetik", label: "Estetik Klinik" },
  { value: "makyaj", label: "Makyaj Stüdyosu" },
  { value: "tattoo", label: "Tattoo Stüdyosu" },
  { value: "diyetisyen", label: "Diyetisyen" },
  { value: "kas_kirpik", label: "Kaş & Kirpik" },
];

export default function AyarlarPage() {
  const [org, setOrg] = useState<Partial<Organization> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("org_members").select("org_id, organizations(*)").eq("user_id", (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id || "";
    })() as unknown as string)
      .then(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: member } = await supabase
          .from("org_members")
          .select("org_id")
          .eq("user_id", user.id)
          .single();
        if (!member) return;
        const { data: orgData } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", member.org_id)
          .single();
        setOrg(orgData);
        setLoading(false);
      });
  }, []);

  async function handleSave() {
    if (!org) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("organizations")
      .update({
        name: org.name,
        type: org.type,
        phone: org.phone,
        email: org.email,
        address: org.address,
        city: org.city,
        instagram_handle: org.instagram_handle,
        whatsapp_number: org.whatsapp_number,
        locale: org.locale,
        working_hours_json: org.working_hours_json,
        settings_json: org.settings_json ?? {},
      })
      .eq("id", org.id!);

    if (error) {
      toast.error("Kayıt başarısız: " + error.message);
    } else {
      toast.success("Ayarlar kaydedildi!");
    }
    setSaving(false);
  }

  function setField(field: keyof Organization, value: unknown) {
    setOrg((prev) => prev ? { ...prev, [field]: value } : prev);
  }

  if (loading || !org) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ayarlar</h1>
        <p className="text-muted-foreground text-sm">Salon bilgilerinizi güncelleyin</p>
      </div>

      {/* Basic info */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Salon Bilgileri
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Salon Adı</Label>
              <Input className="mt-1" value={org.name || ""} onChange={(e) => setField("name", e.target.value)} />
            </div>
            <div>
              <Label>İşletme Türü</Label>
              <Select value={org.type || ""} onValueChange={(v) => setField("type", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BUSINESS_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Telefon</Label>
              <Input className="mt-1" value={org.phone || ""} onChange={(e) => setField("phone", e.target.value)} placeholder="05xx xxx xxxx" />
            </div>
            <div>
              <Label>E-posta</Label>
              <Input className="mt-1" type="email" value={org.email || ""} onChange={(e) => setField("email", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Adres</Label>
            <Input className="mt-1" value={org.address || ""} onChange={(e) => setField("address", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Şehir</Label>
              <Input className="mt-1" value={org.city || ""} onChange={(e) => setField("city", e.target.value)} />
            </div>
            <div>
              <Label>Dil</Label>
              <Select value={org.locale || "tr"} onValueChange={(v) => setField("locale", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tr">🇹🇷 Türkçe</SelectItem>
                  <SelectItem value="en">🇬🇧 English</SelectItem>
                  <SelectItem value="ru">🇷🇺 Русский</SelectItem>
                  <SelectItem value="ar">🇸🇦 العربية</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integrations */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            Sosyal Medya & Entegrasyonlar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Instagram Kullanıcı Adı</Label>
            <div className="flex mt-1">
              <span className="px-3 py-2 border border-r-0 rounded-l-lg bg-muted text-muted-foreground text-sm">@</span>
              <Input className="rounded-l-none" value={org.instagram_handle || ""} onChange={(e) => setField("instagram_handle", e.target.value)} placeholder="salonadınız" />
            </div>
          </div>
          <div>
            <Label>WhatsApp Numarası (Müşterilere gösterilecek)</Label>
            <Input className="mt-1" value={org.whatsapp_number || ""} onChange={(e) => setField("whatsapp_number", e.target.value)} placeholder="+90 5xx xxx xxxx" />
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            WhatsApp Business API entegrasyonu için{" "}
            <a href="mailto:destek@bysirius.com" className="text-primary hover:underline">destek ekibi</a>
            {" "}ile iletişime geçin.
          </div>
        </CardContent>
      </Card>

      {/* Working hours */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Çalışma Saatleri
          </CardTitle>
          <CardDescription>Kapalı günler için açma/kapama saatlerini boş bırakın</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {DAYS.map((day) => {
              const hours = (org.working_hours_json as Record<string, { open: string; close: string } | null>)?.[day.key];
              const isOpen = hours !== null && hours !== undefined;
              return (
                <div key={day.key} className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      const wh = { ...(org.working_hours_json as Record<string, unknown>) };
                      wh[day.key] = isOpen ? null : { open: "09:00", close: "20:00" };
                      setField("working_hours_json", wh);
                    }}
                    className={`w-4 h-4 rounded border-2 transition-colors ${isOpen ? "bg-primary border-primary" : "border-border"}`}
                  />
                  <span className="w-24 text-sm font-medium">{day.label}</span>
                  {isOpen ? (
                    <>
                      <Input
                        type="time"
                        value={hours?.open || "09:00"}
                        onChange={(e) => {
                          const wh = { ...(org.working_hours_json as Record<string, unknown>) };
                          wh[day.key] = { ...(hours || {}), open: e.target.value };
                          setField("working_hours_json", wh);
                        }}
                        className="w-28 text-sm"
                      />
                      <span className="text-muted-foreground text-sm">–</span>
                      <Input
                        type="time"
                        value={hours?.close || "20:00"}
                        onChange={(e) => {
                          const wh = { ...(org.working_hours_json as Record<string, unknown>) };
                          wh[day.key] = { ...(hours || {}), close: e.target.value };
                          setField("working_hours_json", wh);
                        }}
                        className="w-28 text-sm"
                      />
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">Kapalı</span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Staff permissions */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Personel Yetkileri
          </CardTitle>
          <CardDescription>Personel rolündeki çalışanların erişimini ayarlayın</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            {
              key: "staff_phone_access",
              label: "Müşteri telefon numaralarını görsün",
              desc: "Personel, müşteri listesinde 📞 Ara ve 💬 WA butonlarını kullanabilsin",
              default: true,
            },
          ].map((perm) => {
            const settings = (org.settings_json ?? {}) as Record<string, unknown>;
            const value = perm.key in settings ? !!settings[perm.key] : perm.default;
            return (
              <div key={perm.key} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                <Checkbox
                  id={perm.key}
                  checked={value}
                  onCheckedChange={(checked) => {
                    const cur = (org.settings_json ?? {}) as Record<string, unknown>;
                    setField("settings_json", { ...cur, [perm.key]: !!checked });
                  }}
                  className="mt-0.5"
                />
                <label htmlFor={perm.key} className="cursor-pointer flex-1">
                  <p className="text-sm font-medium leading-snug">{perm.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{perm.desc}</p>
                </label>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Button className="w-full gap-2" onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Kaydet
      </Button>
    </div>
  );
}
