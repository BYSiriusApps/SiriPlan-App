"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getActiveMemberClient } from "@/lib/active-org-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Save, Building2, Link2, Clock, ShieldCheck, MessageCircle, ChevronRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type { Organization } from "@/types/database";
import { InstallPwaCard } from "@/components/dashboard/InstallPwaCard";
import { HomeButton } from "@/components/dashboard/HomeButton";
import { DEFAULT_WA_TEMPLATE, WA_TEMPLATE_VARS, renderWaTemplate } from "@/lib/wa-template";

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

interface StaffListItem {
  id: string;
  full_name: string;
  role: string;
}

export default function AyarlarPage() {
  const [org, setOrg] = useState<Partial<Organization> | null>(null);
  const [staffList, setStaffList] = useState<StaffListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const member = await getActiveMemberClient(supabase);
        if (!member) return;
        const [{ data: orgData }, { data: staffData }] = await Promise.all([
          supabase.from("organizations").select("*").eq("id", member.org_id).single(),
          supabase
            .from("staff")
            .select("id, full_name, role")
            .eq("org_id", member.org_id)
            .eq("is_active", true)
            .order("display_order"),
        ]);
        setOrg(orgData);
        setStaffList(staffData ?? []);
      } finally {
        setLoading(false);
      }
    })();
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
        custom_reminder_message: org.custom_reminder_message,
        custom_cancellation_message: org.custom_cancellation_message,
        whatsapp_notifications_enabled: org.whatsapp_notifications_enabled,
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
        <div className="flex items-center gap-3"><h1 className="text-2xl font-bold">Ayarlar</h1><HomeButton /></div>
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

      {/* Otomatik randevu mesajı */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-green-600" />
            Otomatik Randevu Mesajı (WhatsApp)
          </CardTitle>
          <CardDescription>
            Yeni randevu oluşturulduğunda müşteriye gönderilen bilgilendirme metni.
            Tarih ve saat her randevuda otomatik doldurulur.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            className="w-full text-sm border border-border rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px] bg-background"
            value={
              ((org.settings_json as Record<string, unknown> | null)?.wa_appointment_template as string | undefined) ??
              DEFAULT_WA_TEMPLATE
            }
            onChange={(e) => {
              const cur = (org.settings_json ?? {}) as Record<string, unknown>;
              setField("settings_json", { ...cur, wa_appointment_template: e.target.value });
            }}
            placeholder={DEFAULT_WA_TEMPLATE}
          />
          <div className="flex gap-1.5 flex-wrap items-center">
            <span className="text-xs text-muted-foreground">Değişkenler:</span>
            {WA_TEMPLATE_VARS.map((v) => (
              <button
                key={v.key}
                type="button"
                title={v.desc}
                onClick={() => {
                  const cur = (org.settings_json ?? {}) as Record<string, unknown>;
                  const existing = (cur.wa_appointment_template as string | undefined) ?? DEFAULT_WA_TEMPLATE;
                  setField("settings_json", { ...cur, wa_appointment_template: existing + " " + v.key });
                }}
                className="text-xs px-2 py-1 rounded bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {v.key}
              </button>
            ))}
          </div>
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/50">
            <p className="text-[11px] font-medium text-green-700 dark:text-green-400 mb-1">Örnek önizleme:</p>
            <p className="text-xs text-muted-foreground italic">
              {renderWaTemplate(
                ((org.settings_json as Record<string, unknown> | null)?.wa_appointment_template as string | undefined) ?? null,
                {
                  musteri: "Ayşe Yıldız",
                  salon: org.name || "Salonunuz",
                  appointmentAt: "2026-07-20T15:00",
                  hizmet: "Saç Kesimi",
                  personel: "Elif",
                }
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp Bildirim Ayarları (hatırlatma / iptal) */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-green-600" />
            WhatsApp Bildirim Ayarları
          </CardTitle>
          <CardDescription>
            Randevu saatine yaklaşırken otomatik gönderilen hatırlatma ve iptal
            mesajlarının altına eklenen özel not.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg border border-border">
            <Checkbox
              id="whatsapp_notifications_enabled"
              checked={org.whatsapp_notifications_enabled ?? true}
              onCheckedChange={(checked) => setField("whatsapp_notifications_enabled", !!checked)}
              className="mt-0.5"
            />
            <label htmlFor="whatsapp_notifications_enabled" className="cursor-pointer flex-1">
              <p className="text-sm font-medium">Otomatik WhatsApp hatırlatmaları açık</p>
              <p className="text-xs text-muted-foreground">
                Kapatırsanız randevu saatine 2 saat kala giden otomatik hatırlatma mesajı gönderilmez.
              </p>
            </label>
          </div>

          <div className="space-y-1.5">
            <Label>Hatırlatma mesajı özel notu</Label>
            <textarea
              className="w-full text-sm border border-border rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary min-h-[70px] bg-background"
              value={org.custom_reminder_message ?? ""}
              onChange={(e) => setField("custom_reminder_message", e.target.value)}
              placeholder="Lütfen randevunuza saatinde gelmeye özen gösteriniz."
            />
          </div>

          <div className="space-y-1.5">
            <Label>İptal mesajı özel notu (opsiyonel)</Label>
            <textarea
              className="w-full text-sm border border-border rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary min-h-[70px] bg-background"
              value={org.custom_cancellation_message ?? ""}
              onChange={(e) => setField("custom_cancellation_message", e.target.value)}
              placeholder="Randevunuz iptal edilmiştir. Yeniden randevu almak için bizi arayabilirsiniz."
            />
          </div>

          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/50">
            <p className="text-[11px] font-medium text-green-700 dark:text-green-400 mb-1">WhatsApp önizleme:</p>
            <p className="text-xs text-muted-foreground italic">
              Sayın Ayşe Yıldız, {org.name || "Salonunuz"} salonundaki 28.07.2026 14:30 tarihli randevunuz
              Hatırlatma. Detay: {org.custom_reminder_message?.trim() || "Lütfen randevunuza saatinde gelmeye özen gösteriniz."}
            </p>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Meta WhatsApp kuralları gereği bu mesajlar önceden onaylı şablon üzerinden gider —
            yukarıdaki not şablonun son değişkenine ({"{{5}}"}) dinamik olarak eklenir.
          </p>
        </CardContent>
      </Card>

      {/* Uygulamayı telefona ekle (PWA) */}
      <InstallPwaCard />

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

          <div className="pt-2 border-t space-y-2">
            <p className="text-xs font-medium text-muted-foreground pt-2">
              Bireysel personel yetkileri (rol, izinler)
            </p>
            {staffList.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">Henüz personel eklenmemiş.</p>
            ) : (
              staffList.map((s) => (
                <Link
                  key={s.id}
                  href={`/dashboard/personel/${s.id}`}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{s.full_name}</p>
                    <p className="text-xs text-muted-foreground">{s.role}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs text-primary shrink-0">
                    Yetkileri Düzenle
                    <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Button className="w-full gap-2" onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Kaydet
      </Button>
    </div>
  );
}
