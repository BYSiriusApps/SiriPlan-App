"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { getActiveMemberClient } from "@/lib/active-org-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GlassCard3D } from "@/components/ui/GlassCard3D";
import { toast } from "sonner";
import { Loader2, Save, Building2, Link2, Clock, ShieldCheck, MessageCircle, MessageSquareText, ChevronRight, CalendarCheck, Copy, Check, QrCode, Send, ImageUp, X, MapPin, CreditCard, Percent, Trash2, AlertTriangle, KeyRound, Globe, type LucideIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Organization } from "@/types/database";
import { InstallPwaCard } from "@/components/dashboard/InstallPwaCard";
import { useIsMobileApp } from "@/lib/use-mobile-app";
import { HomeButton } from "@/components/dashboard/HomeButton";
import { LegalNoticeModal } from "@/components/dashboard/LegalNoticeModal";
import { TIMEZONE_OPTIONS } from "@/lib/timezones";
import {
  DEFAULT_WA_TEMPLATE,
  DEFAULT_WA_CANCEL_TEMPLATE,
  DEFAULT_WA_REVIZE_TEMPLATE,
  DEFAULT_WA_REMINDER_TEMPLATE,
  WA_TEMPLATE_VARS,
  renderWaTemplate,
} from "@/lib/wa-template";
import {
  DEFAULT_WA_TEMPLATE_STYLES,
  WA_REMINDER_OFFSET_PRESETS,
} from "@/lib/wa-templates/registry";
import { DEFAULT_KVKK_NOTICE_TEMPLATE, renderKvkkNotice } from "@/lib/kvkk";
import { isValidTaxNumber, normalizeTaxNumber, TAX_NUMBER_MAX_LENGTH } from "@/lib/tax-number";
import { CURRENCIES } from "@/lib/currency";
import QRCode from "qrcode";

// Website modu örneği için sabit bir demo organizasyona bağlanır. Tek bir
// spesifik satıra (slug) doğrudan gömmek yerine ortam değişkeninden okunur:
// o demo org silinir/yeniden adlandırılırsa kod değişikliği gerekmeden tek
// yerden (Vercel env) güncellenebilir. (bkz. 404 tekrarını önleme notu)
const DEMO_SALON_SLUG = process.env.NEXT_PUBLIC_DEMO_SALON_SLUG || "sirius-demo-salon";

// Meta'da kayıtlı gerçek şablon metni bu kod tabanında tutulmaz (onay süreci
// Meta WhatsApp Business panelinde yürür) — burada gösterilen yalnızca hangi
// parametrelerin hangi sırayla gönderileceğini örnekleyen yaklaşık bir önizlemedir.
// Dile göre örnek metin settingsPage.metaPreview altındaki anahtarlardan okunur.
const META_PREVIEW_VARIANTS: Record<string, string[]> = {
  onay: ["sicak", "v2"],
  iptal: ["sicak", "v1", "v2"],
  hatirlatma: ["sicak", "v1", "v2"],
  revize: ["sicak"],
};

const SMS_PROVIDER_VALUES = ["netgsm", "vatansms", "iletimerkezi"] as const;
type SmsProviderValue = (typeof SMS_PROVIDER_VALUES)[number];
const SMS_PROVIDER_LABELS: Record<SmsProviderValue, string> = {
  netgsm: "Netgsm",
  vatansms: "VatanSMS",
  iletimerkezi: "İletimerkezi",
};

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_LABEL_KEYS: Record<(typeof DAY_KEYS)[number], string> = {
  mon: "dayMon", tue: "dayTue", wed: "dayWed", thu: "dayThu", fri: "dayFri", sat: "daySat", sun: "daySun",
};

const BUSINESS_TYPE_VALUES = [
  "kuafor", "berber", "guzellik", "spa", "nail", "estetik", "makyaj", "tattoo", "diyetisyen", "kas_kirpik",
] as const;
const BUSINESS_TYPE_LABEL_KEYS: Record<(typeof BUSINESS_TYPE_VALUES)[number], string> = {
  kuafor: "bizKuafor", berber: "bizBerber", guzellik: "bizGuzellik", spa: "bizSpa", nail: "bizNail",
  estetik: "bizEstetik", makyaj: "bizMakyaj", tattoo: "bizTattoo", diyetisyen: "bizDiyetisyen", kas_kirpik: "bizKasKirpik",
};

interface StaffListItem {
  id: string;
  full_name: string;
  role: string;
}

/* ─── Kart çerçevesi — mevcut glass-card / panel-header token sistemiyle uyumlu ─── */
function SectionCard({
  icon: Icon,
  iconClassName = "text-primary",
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  iconClassName?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <GlassCard3D className="glass-card" glow intensity={3}>
      <div className="panel-header">
        <span className="flex items-center gap-2 text-[13px] font-bold tracking-wider uppercase text-primary">
          <Icon className={`h-4 w-4 ${iconClassName}`} />
          {title}
        </span>
      </div>
      <div className="px-4 py-3.5 space-y-3">
        {description && <p className="text-xs text-muted-foreground -mt-1">{description}</p>}
        {children}
      </div>
    </GlassCard3D>
  );
}

export default function AyarlarPage() {
  const t = useTranslations("dashboard");
  const tsp = useTranslations("dashboard.staffPermissions");
  const DELETE_CONFIRM_PHRASE = t("settingsPage.deleteConfirmPhrase");
  const orgNameFallback = t("settingsPage.orgNameFallback");

  // preset metinleri {musteri}/{salon} gibi uygulama-içi değişkenler taşır;
  // next-intl bunları ICU argümanı sanmasın diye t.raw ile alınır.
  const APPOINTMENT_TEMPLATE_PRESETS = [
    { key: "sicak", label: t("settingsPage.presetSicakLabel"), text: t.raw("settingsPage.presetSicakText") as string },
    { key: "kisa", label: t("settingsPage.presetKisaLabel"), text: t.raw("settingsPage.presetKisaText") as string },
    { key: "resmi", label: t("settingsPage.presetResmiLabel"), text: t.raw("settingsPage.presetResmiText") as string },
    { key: "hizmetli", label: t("settingsPage.presetHizmetliLabel"), text: t.raw("settingsPage.presetHizmetliText") as string },
  ];

  const smsProviderFieldLabels: Record<SmsProviderValue, { user: string; pass: string }> = {
    netgsm: { user: t("settingsPage.smsProviderUserCode"), pass: t("settingsPage.smsProviderPassword") },
    vatansms: { user: t("settingsPage.smsProviderApiId"), pass: t("settingsPage.smsProviderApiKey") },
    iletimerkezi: { user: t("settingsPage.smsProviderUsername"), pass: t("settingsPage.smsProviderPasswordSimple") },
  };

  function metaPreview(
    purpose: string,
    style: string,
    params: { customerName: string; orgName: string; businessPhone: string }
  ): string {
    const list = META_PREVIEW_VARIANTS[purpose];
    if (!list) return "";
    const chosen = list.includes(style) ? style : list[0];
    return t(`settingsPage.metaPreview.${purpose}_${chosen}`, {
      customerName: params.customerName,
      orgName: params.orgName,
      businessPhone: params.businessPhone || t("settingsPage.metaPreview.businessPhoneFallback"),
    });
  }
  const router = useRouter();
  const [org, setOrg] = useState<Partial<Organization> | null>(null);
  const [staffList, setStaffList] = useState<StaffListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [locating, setLocating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [legalNoticeModalOpen, setLegalNoticeModalOpen] = useState(false);
  // Native uygulamada mağaza kuralları gereği plan yükseltme çağrısı gösterilmez.
  const mobileApp = useIsMobileApp();
  const [manualTab, setManualTab] = useState<"onay" | "iptal" | "revize" | "hatirlatma">("onay");

  async function handleDeleteAccount() {
    if (deleteConfirmText !== DELETE_CONFIRM_PHRASE) return;
    setDeletingAccount(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: deleteConfirmText }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || t("settingsPage.toastAccountDeleteFailed"));
        setDeletingAccount(false);
        return;
      }
      toast.success(t("settingsPage.toastAccountDeleted"));
      const supabase = createClient();
      await supabase.auth.signOut().catch(() => {});
      router.push("/auth/giris");
    } catch {
      toast.error(t("settingsPage.toastAccountDeleteFailed"));
      setDeletingAccount(false);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast.error(t("settingsPage.toastGeoUnsupported"));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setField("location_url", `https://www.google.com/maps?q=${latitude},${longitude}`);
        setLocating(false);
        toast.success(t("settingsPage.toastGeoOk"));
      },
      () => {
        setLocating(false);
        toast.error(t("settingsPage.toastGeoFailed"));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

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
    if (org.tax_number && !isValidTaxNumber(org.tax_number)) {
      toast.error(t("settingsPage.taxNumberError"));
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const payload: Record<string, unknown> = {
        name: org.name,
        type: org.type,
        phone: org.phone,
        email: org.email,
        address: org.address,
        city: org.city,
        tax_number: org.tax_number || null,
        location_url: org.location_url,
        logo_url: org.logo_url,
        instagram_handle: org.instagram_handle,
        tiktok_handle: org.tiktok_handle,
        facebook_handle: org.facebook_handle,
        linkedin_handle: org.linkedin_handle,
        whatsapp_number: org.whatsapp_number,
        telegram_chat_id: org.telegram_chat_id,
        locale: org.locale,
        timezone: org.timezone || "Europe/Istanbul",
        working_hours_json: org.working_hours_json,
        custom_reminder_message: org.custom_reminder_message,
        custom_cancellation_message: org.custom_cancellation_message,
        whatsapp_notifications_enabled: org.whatsapp_notifications_enabled,
        wa_template_styles: org.wa_template_styles ?? DEFAULT_WA_TEMPLATE_STYLES,
        wa_reminder_offsets_hours: org.wa_reminder_offsets_hours ?? [2],
        sms_notifications_enabled: org.sms_notifications_enabled ?? false,
        sms_provider: org.sms_provider,
        sms_username: org.sms_username,
        sms_password: org.sms_password,
        sms_sender_id: org.sms_sender_id,
        wa_token: org.wa_token,
        wa_phone_number_id: org.wa_phone_number_id,
        kdv_enabled: org.kdv_enabled ?? false,
        kdv_rate: org.kdv_rate ?? 20,
        has_auto_booking: org.has_auto_booking ?? false,
        kvkk_notice_text: org.kvkk_notice_text,
        settings_json: org.settings_json ?? {},
    };

    let { error } = await supabase.from("organizations").update(payload).eq("id", org.id!);

    // tax_number / facebook_handle / linkedin_handle kolonları henüz
    // uygulanmamışsa (migration sırası) yalnızca o alan düşürülüp aynı payload
    // tekrar denenir — tüm ayarlar sayfası tek bir yeni alan yüzünden
    // kaydedilemez hâle gelmemeli.
    if (error && /tax_number/.test(error.message)) {
      delete payload.tax_number;
      ({ error } = await supabase.from("organizations").update(payload).eq("id", org.id!));
    }
    if (error && /facebook_handle/.test(error.message)) {
      delete payload.facebook_handle;
      ({ error } = await supabase.from("organizations").update(payload).eq("id", org.id!));
    }
    if (error && /linkedin_handle/.test(error.message)) {
      delete payload.linkedin_handle;
      ({ error } = await supabase.from("organizations").update(payload).eq("id", org.id!));
    }

    if (error) {
      toast.error(t("settingsPage.toastSaveFailed") + error.message);
    } else {
      toast.success(t("settingsPage.toastSaved"));
    }
    setSaving(false);
  }

  function setField(field: keyof Organization, value: unknown) {
    setOrg((prev) => prev ? { ...prev, [field]: value } : prev);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !org?.id) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("settingsPage.toastPickImage"));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t("settingsPage.toastFileTooLarge"));
      return;
    }
    setUploadingLogo(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${org.id}/logo.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("org-logos")
      .upload(path, file, { upsert: true, cacheControl: "3600" });
    if (upErr) {
      toast.error(t("settingsPage.toastUploadFailed") + upErr.message);
      setUploadingLogo(false);
      return;
    }
    const { data: pub } = supabase.storage.from("org-logos").getPublicUrl(path);
    const publicUrl = `${pub.publicUrl}?t=${Date.now()}`;
    const { error: dbErr } = await supabase
      .from("organizations")
      .update({ logo_url: publicUrl })
      .eq("id", org.id);
    if (dbErr) {
      toast.error(t("settingsPage.toastSaveFailedShort") + dbErr.message);
    } else {
      setField("logo_url", publicUrl);
      toast.success(t("settingsPage.toastLogoUpdated"));
    }
    setUploadingLogo(false);
  }

  async function handleLogoRemove() {
    if (!org?.id) return;
    const supabase = createClient();
    const { error } = await supabase.from("organizations").update({ logo_url: null }).eq("id", org.id);
    if (error) {
      toast.error(t("settingsPage.toastRemoveFailed") + error.message);
    } else {
      setField("logo_url", null);
      toast.success(t("settingsPage.toastLogoRemoved"));
    }
  }

  const bookingLink = org?.slug
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? "https://siriplan.com"}/r/${org.slug}`
    : "";

  useEffect(() => {
    if (!bookingLink) return;
    QRCode.toDataURL(bookingLink, { width: 320, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [bookingLink]);

  async function copyBookingLink() {
    if (!bookingLink) return;
    try {
      await navigator.clipboard.writeText(bookingLink);
      setLinkCopied(true);
      toast.success(t("settingsPage.toastLinkCopied"));
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error(t("settingsPage.toastLinkCopyFailed"));
    }
  }

  function shareBookingLinkOnWhatsApp() {
    if (!bookingLink) return;
    const text = t("settingsPage.waShareText", {
      salon: org?.name || t("settingsPage.waShareFallbackName"),
      link: bookingLink,
    });
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  if (loading || !org) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-24 max-w-2xl mx-auto space-y-4">
      <header className="flex items-start justify-between gap-3 pb-1">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/70 block">{t("settingsPage.eyebrow")}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold brand-gradient-text leading-tight">{t("settingsPage.title")}</h1>
            <HomeButton />
          </div>
          <p className="text-sm text-muted-foreground mt-1">{t("settingsPage.subtitle")}</p>
        </div>
      </header>

      {/* Abonelik & fatura — mobilde alt menüde yer olmadığı için buradan erişim */}
      <Link
        href="/dashboard/abonelik"
        className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 text-primary shrink-0">
          <CreditCard className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{t("settingsPage.billingCardTitle")}</p>
          {/* Native uygulamada "ödeme" kelimesi bile bir yönlendirme sinyalidir. */}
          <p className="text-xs text-muted-foreground">
            {mobileApp ? t("settingsPage.billingCardDescMobile") : t("settingsPage.billingCardDesc")}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </Link>

      {/* Basic info */}
      <SectionCard icon={Building2} title={t("settingsPage.basicInfoTitle")}>
        <div className="flex items-center gap-3">
          {org.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.logo_url} alt="Logo" className="w-16 h-16 rounded-xl object-cover border border-border shrink-0" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-2xl shrink-0">
              {(org.name || "S")[0]}
            </div>
          )}
          <div className="space-y-1.5">
            <Label>{t("settingsPage.logoLabel")}</Label>
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border cursor-pointer hover:bg-muted/50 transition-colors">
                {uploadingLogo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageUp className="h-3.5 w-3.5" />}
                {org.logo_url ? t("settingsPage.logoChangeButton") : t("settingsPage.logoUploadButton")}
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
              </label>
              {org.logo_url && (
                <button
                  type="button"
                  onClick={handleLogoRemove}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-red-600 transition-colors"
                >
                  <X className="h-3.5 w-3.5" /> {t("settingsPage.logoRemoveButton")}
                </button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">{t("settingsPage.logoHint")}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t("settingsPage.salonNameLabel")}</Label>
            <Input className="mt-1" value={org.name || ""} onChange={(e) => setField("name", e.target.value)} />
          </div>
          <div>
            <Label>{t("settingsPage.businessTypeLabel")}</Label>
            <Select value={org.type || ""} onValueChange={(v) => setField("type", v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {BUSINESS_TYPE_VALUES.map((val) => (
                  <SelectItem key={val} value={val}>{t(`settingsPage.${BUSINESS_TYPE_LABEL_KEYS[val]}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t("settingsPage.phoneLabel")}</Label>
            <Input className="mt-1" value={org.phone || ""} onChange={(e) => setField("phone", e.target.value)} placeholder="5xx xxx xx xx" />
          </div>
          <div>
            <Label>{t("settingsPage.emailLabel")}</Label>
            <Input className="mt-1" type="email" value={org.email || ""} onChange={(e) => setField("email", e.target.value)} />
          </div>
        </div>
        <div>
          <Label>
            {t("settingsPage.taxNumberLabel")}{" "}
            <span className="text-xs font-normal text-muted-foreground">{t("settingsPage.optionalTag")}</span>
          </Label>
          <Input
            className="mt-1"
            inputMode="numeric"
            maxLength={TAX_NUMBER_MAX_LENGTH}
            value={org.tax_number || ""}
            onChange={(e) => setField("tax_number", normalizeTaxNumber(e.target.value))}
            placeholder={t("settingsPage.taxNumberPlaceholder")}
          />
          {org.tax_number && !isValidTaxNumber(org.tax_number) && (
            <p className="text-xs text-red-500 mt-1">{t("settingsPage.taxNumberError")}</p>
          )}
        </div>
        <div>
          <Label>{t("settingsPage.addressLabel")}</Label>
          <Input className="mt-1" value={org.address || ""} onChange={(e) => setField("address", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t("settingsPage.cityLabel")}</Label>
            <Input className="mt-1" value={org.city || ""} onChange={(e) => setField("city", e.target.value)} />
          </div>
          <div>
            <Label>{t("settingsPage.languageLabel")}</Label>
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
        <div>
          <Label>{t("settingsPage.timezoneLabel")}</Label>
          <Select value={org.timezone || "Europe/Istanbul"} onValueChange={(v) => setField("timezone", v ?? "Europe/Istanbul")}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIMEZONE_OPTIONS.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">{t("settingsPage.timezoneHint")}</p>
        </div>
        <div className="space-y-1">
          <Label>{t("settingsPage.locationLabel")}</Label>
          <div className="flex gap-2 mt-1">
            <Input
              className="flex-1"
              value={org.location_url || ""}
              onChange={(e) => setField("location_url", e.target.value)}
              placeholder="https://maps.app.goo.gl/..."
            />
            <Button
              type="button"
              variant="outline"
              onClick={useMyLocation}
              disabled={locating}
              className="shrink-0 gap-1.5"
            >
              {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
              {t("settingsPage.useMyLocationButton")}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">{t("settingsPage.locationHint")}</p>
        </div>
      </SectionCard>

      {/* Online randevu linki */}
      <SectionCard
        icon={CalendarCheck}
        iconClassName="text-rose-600"
        title={t("settingsPage.bookingLinkTitle")}
        description={t("settingsPage.bookingLinkDesc")}
      >
        {org.slug ? (
          <>
            <div className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-muted/40">
              <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <a
                href={bookingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary truncate hover:underline flex-1 min-w-0"
              >
                {bookingLink}
              </a>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1 gap-2" onClick={copyBookingLink}>
                {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {linkCopied ? t("settingsPage.linkCopiedButton") : t("settingsPage.copyLinkButton")}
              </Button>
              <Button
                type="button"
                className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white"
                onClick={shareBookingLinkOnWhatsApp}
              >
                <MessageCircle className="h-4 w-4" />
                {t("settingsPage.shareWhatsAppButton")}
              </Button>
            </div>
            <details className="group">
              <summary className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none w-fit">
                <QrCode className="h-3.5 w-3.5" />
                {t("settingsPage.qrShareSummary")}
              </summary>
              <div className="mt-2 flex items-center gap-3 p-3 rounded-lg border border-border bg-white w-fit">
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrDataUrl} alt={t("settingsPage.qrAlt")} width={160} height={160} />
                ) : (
                  <div className="h-[160px] w-[160px] flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}
                <p className="text-xs text-muted-foreground max-w-[140px]">
                  {t("settingsPage.qrShareHint")}
                </p>
              </div>
            </details>

            {org.plan !== "pro" && org.plan !== "business" && !mobileApp && (
              <div className="flex items-start gap-3 p-3.5 rounded-xl border border-primary/30 bg-primary/5">
                <Globe className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{t("settingsPage.websiteUpsellTitle")}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("settingsPage.websiteUpsellDesc")}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2.5">
                    <Link
                      href="/dashboard/abonelik"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      {t("settingsPage.upgradeToProButton")}
                    </Link>
                    <a
                      href={`/r/${DEMO_SALON_SLUG}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors"
                    >
                      {t("settingsPage.viewSampleWebsiteButton")}
                    </a>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t("settingsPage.bookingLinkFailed")}</p>
        )}
      </SectionCard>

      {/* Integrations */}
      <SectionCard icon={Link2} title={t("settingsPage.integrationsTitle")}>
        <div>
          <Label>{t("settingsPage.instagramLabel")}</Label>
          <div className="flex mt-1">
            <span className="px-3 py-2 border border-r-0 rounded-l-lg bg-muted text-muted-foreground text-sm">@</span>
            <Input className="rounded-l-none" value={org.instagram_handle || ""} onChange={(e) => setField("instagram_handle", e.target.value)} placeholder={t("settingsPage.socialHandlePlaceholder")} />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">{t("settingsPage.socialIconHint")}</p>
        </div>
        <div>
          <Label>{t("settingsPage.tiktokLabel")}</Label>
          <div className="flex mt-1">
            <span className="px-3 py-2 border border-r-0 rounded-l-lg bg-muted text-muted-foreground text-sm">@</span>
            <Input className="rounded-l-none" value={org.tiktok_handle || ""} onChange={(e) => setField("tiktok_handle", e.target.value)} placeholder={t("settingsPage.socialHandlePlaceholder")} />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">{t("settingsPage.socialIconHint")}</p>
        </div>
        <div>
          <Label>{t("settingsPage.facebookLabel")}</Label>
          <div className="flex mt-1">
            <span className="px-3 py-2 border border-r-0 rounded-l-lg bg-muted text-muted-foreground text-sm">@</span>
            <Input className="rounded-l-none" value={org.facebook_handle || ""} onChange={(e) => setField("facebook_handle", e.target.value)} placeholder={t("settingsPage.socialHandlePlaceholder")} />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">{t("settingsPage.socialIconHint")}</p>
        </div>
        <div>
          <Label>{t("settingsPage.linkedinLabel")}</Label>
          <div className="flex mt-1">
            <span className="px-3 py-2 border border-r-0 rounded-l-lg bg-muted text-muted-foreground text-sm">@</span>
            <Input className="rounded-l-none" value={org.linkedin_handle || ""} onChange={(e) => setField("linkedin_handle", e.target.value)} placeholder={t("settingsPage.socialHandlePlaceholder")} />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">{t("settingsPage.socialIconHint")}</p>
        </div>
        <div>
          <Label>{t("settingsPage.whatsappNumberLabel")}</Label>
          <Input className="mt-1" value={org.whatsapp_number || ""} onChange={(e) => setField("whatsapp_number", e.target.value)} placeholder="+90 5xx xxx xxxx" />
        </div>
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50 border border-border">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{t("settingsPage.whatsappBusinessLabel")}</p>
            <p className="text-xs text-muted-foreground">
              {t("settingsPage.whatsappBusinessHintPre")}{" "}
              <a href="mailto:info@bysirius.com" className="text-primary hover:underline">{t("settingsPage.supportTeamLink")}</a>
              {t("settingsPage.whatsappBusinessHintPost")}
            </p>
          </div>
        </div>

        <div className="pt-1 space-y-2">
          <Label className="flex items-center gap-1.5">
            <Send className="h-3.5 w-3.5 text-primary" />
            {t("settingsPage.telegramLabel")}
          </Label>
          <Input
            className="mt-1"
            value={org.telegram_chat_id || ""}
            onChange={(e) => setField("telegram_chat_id", e.target.value)}
            placeholder="123456789"
          />
          <p className="text-xs text-muted-foreground">
            {t("settingsPage.telegramHint")}
          </p>
          <details className="group">
            <summary className="text-xs text-primary cursor-pointer select-none w-fit hover:underline">
              {t("settingsPage.telegramHelpSummary")}
            </summary>
            <ol className="mt-2 text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>{t("settingsPage.telegramStep1")}</li>
              <li>{t("settingsPage.telegramStep2")}</li>
              <li>{t("settingsPage.telegramStep3")}</li>
            </ol>
          </details>
        </div>
      </SectionCard>

      {/* Otomatik randevu mesajı */}
      <SectionCard
        icon={MessageCircle}
        iconClassName="text-green-600"
        title={t("settingsPage.autoMessageTitle")}
        description={t("settingsPage.autoMessageDesc")}
      >
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            {t("settingsPage.autoMessageWarning")}
          </p>
        </div>

        <div className="flex border-b border-border mb-3 overflow-x-auto whitespace-nowrap">
          {(
            [
              { key: "onay", label: t("settingsPage.tabOnay") },
              { key: "iptal", label: t("settingsPage.tabIptal") },
              { key: "revize", label: t("settingsPage.tabRevize") },
              { key: "hatirlatma", label: t("settingsPage.tabHatirlatma") },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setManualTab(tab.key)}
              className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                manualTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {manualTab === "onay" && (
          <div className="space-y-3">
            <div className="flex gap-1.5 flex-wrap items-center">
              <span className="text-xs text-muted-foreground">{t("settingsPage.templatePickLabel")}</span>
              {APPOINTMENT_TEMPLATE_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => {
                    const cur = (org.settings_json ?? {}) as Record<string, unknown>;
                    setField("settings_json", { ...cur, wa_appointment_template: preset.text });
                  }}
                  className="text-xs px-2.5 py-1 rounded-full border border-border hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
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
          </div>
        )}

        {manualTab === "iptal" && (
          <div className="space-y-3">
            <textarea
              className="w-full text-sm border border-border rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px] bg-background"
              value={
                ((org.settings_json as Record<string, unknown> | null)?.wa_cancellation_template as string | undefined) ??
                DEFAULT_WA_CANCEL_TEMPLATE
              }
              onChange={(e) => {
                const cur = (org.settings_json ?? {}) as Record<string, unknown>;
                setField("settings_json", { ...cur, wa_cancellation_template: e.target.value });
              }}
              placeholder={DEFAULT_WA_CANCEL_TEMPLATE}
            />
          </div>
        )}

        {manualTab === "revize" && (
          <div className="space-y-3">
            <textarea
              className="w-full text-sm border border-border rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px] bg-background"
              value={
                ((org.settings_json as Record<string, unknown> | null)?.wa_revize_template as string | undefined) ??
                DEFAULT_WA_REVIZE_TEMPLATE
              }
              onChange={(e) => {
                const cur = (org.settings_json ?? {}) as Record<string, unknown>;
                setField("settings_json", { ...cur, wa_revize_template: e.target.value });
              }}
              placeholder={DEFAULT_WA_REVIZE_TEMPLATE}
            />
          </div>
        )}

        {manualTab === "hatirlatma" && (
          <div className="space-y-3">
            <textarea
              className="w-full text-sm border border-border rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px] bg-background"
              value={
                ((org.settings_json as Record<string, unknown> | null)?.wa_reminder_template as string | undefined) ??
                DEFAULT_WA_REMINDER_TEMPLATE
              }
              onChange={(e) => {
                const cur = (org.settings_json ?? {}) as Record<string, unknown>;
                setField("settings_json", { ...cur, wa_reminder_template: e.target.value });
              }}
              placeholder={DEFAULT_WA_REMINDER_TEMPLATE}
            />
          </div>
        )}

        <div className="flex gap-1.5 flex-wrap items-center">
          <span className="text-xs text-muted-foreground">{t("settingsPage.variablesLabel")}</span>
          {WA_TEMPLATE_VARS.map((v) => (
            <button
              key={v.key}
              type="button"
              title={t(`settingsPage.waVar.${v.key.replace(/[{}]/g, "")}`)}
              onClick={() => {
                const cur = (org.settings_json ?? {}) as Record<string, unknown>;
                let currentVal = "";
                let targetKey = "";
                let defaultVal = "";

                if (manualTab === "onay") {
                  currentVal = (cur.wa_appointment_template as string | undefined) ?? DEFAULT_WA_TEMPLATE;
                  targetKey = "wa_appointment_template";
                } else if (manualTab === "iptal") {
                  currentVal = (cur.wa_cancellation_template as string | undefined) ?? DEFAULT_WA_CANCEL_TEMPLATE;
                  targetKey = "wa_cancellation_template";
                } else if (manualTab === "revize") {
                  currentVal = (cur.wa_revize_template as string | undefined) ?? DEFAULT_WA_REVIZE_TEMPLATE;
                  targetKey = "wa_revize_template";
                } else if (manualTab === "hatirlatma") {
                  currentVal = (cur.wa_reminder_template as string | undefined) ?? DEFAULT_WA_REMINDER_TEMPLATE;
                  targetKey = "wa_reminder_template";
                }

                setField("settings_json", { ...cur, [targetKey]: currentVal + " " + v.key });
              }}
              className="text-xs px-2 py-1 rounded bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              {v.key}
            </button>
          ))}
        </div>

        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/50">
          <p className="text-[11px] font-medium text-green-700 dark:text-green-400 mb-1">{t("settingsPage.previewLabel")}</p>
          <p className="text-xs text-muted-foreground italic">
            {renderWaTemplate(
              manualTab === "onay"
                ? ((org.settings_json as Record<string, unknown> | null)?.wa_appointment_template as string | undefined)
                : manualTab === "iptal"
                ? ((org.settings_json as Record<string, unknown> | null)?.wa_cancellation_template as string | undefined)
                : manualTab === "revize"
                ? ((org.settings_json as Record<string, unknown> | null)?.wa_revize_template as string | undefined)
                : ((org.settings_json as Record<string, unknown> | null)?.wa_reminder_template as string | undefined),
              {
                musteri: t("settingsPage.sampleCustomerName"),
                salon: org.name || orgNameFallback,
                appointmentAt: manualTab === "revize" ? "2026-07-20T18:00" : "2026-07-20T15:00",
                hizmet: t("settingsPage.sampleServiceName"),
                personel: t("settingsPage.sampleStaffName"),
              },
              manualTab === "onay"
                ? DEFAULT_WA_TEMPLATE
                : manualTab === "iptal"
                ? DEFAULT_WA_CANCEL_TEMPLATE
                : manualTab === "revize"
                ? DEFAULT_WA_REVIZE_TEMPLATE
                : DEFAULT_WA_REMINDER_TEMPLATE
            )}
          </p>
        </div>
      </SectionCard>

      {/* Online randevu — otomatik onay */}
      <SectionCard
        icon={CalendarCheck}
        title={t("settingsPage.onlineBookingSettingsTitle")}
        description={t("settingsPage.onlineBookingDesc")}
      >
        {(org.plan === "pro" || org.plan === "business") ? (
          <div className="flex items-start gap-3 p-3 rounded-lg border border-border">
            <Checkbox
              id="has_auto_booking"
              checked={org.has_auto_booking ?? false}
              onCheckedChange={(checked) => setField("has_auto_booking", !!checked)}
              className="mt-0.5"
            />
            <label htmlFor="has_auto_booking" className="cursor-pointer flex-1">
              <p className="text-sm font-medium">{t("settingsPage.autoConfirmLabel")}</p>
              <p className="text-xs text-muted-foreground">
                {t("settingsPage.autoConfirmDesc")}
              </p>
            </label>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground">
            {t("settingsPage.autoConfirmFreeText")}
          </div>
        )}
        {/* Randevu Dilimi */}
        <div className="pt-3 border-t border-border mt-3">
          <Label className="text-sm font-medium mb-1 block">{t("settingsPage.slotIntervalLabel")}</Label>
          <p className="text-xs text-muted-foreground mb-2">
            {t("settingsPage.slotIntervalDesc")}
          </p>
          <Select
            value={String(((org.settings_json as Record<string, unknown> | null)?.booking_slot_minutes) || 15)}
            onValueChange={(val) => {
              const nextSettings = { ...((org.settings_json as Record<string, unknown> | null) || {}), booking_slot_minutes: Number(val) };
              setField("settings_json", nextSettings);
            }}
          >
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder={t("settingsPage.slotIntervalPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">{t("settingsPage.slot15")}</SelectItem>
              <SelectItem value="30">{t("settingsPage.slot30")}</SelectItem>
              <SelectItem value="60">{t("settingsPage.slot60")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Para Birimi */}
        <div className="pt-3 border-t border-border mt-3">
          <Label className="text-sm font-medium mb-1 block">{t("settingsPage.currencyLabel")}</Label>
          <p className="text-xs text-muted-foreground mb-2">
            {t("settingsPage.currencyDesc")}
          </p>
          <Select
            value={String((org.settings_json as Record<string, unknown> | null)?.currency || "TRY")}
            onValueChange={(val) => {
              const nextSettings = { ...((org.settings_json as Record<string, unknown> | null) || {}), currency: val };
              setField("settings_json", nextSettings);
            }}
          >
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder={t("settingsPage.currencyPlaceholder")}>
                {(value: string) => CURRENCIES.find((c) => c.value === value)?.label || t("settingsPage.currencyPlaceholder")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </SectionCard>

      {/* WhatsApp Bildirim Ayarları (hatırlatma / iptal) */}
      <SectionCard
        icon={MessageCircle}
        iconClassName="text-green-600"
        title={t("settingsPage.whatsappNotifTitle")}
        description={t("settingsPage.whatsappNotifDesc")}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg border border-border">
            <Checkbox
              id="whatsapp_notifications_enabled"
              checked={org.whatsapp_notifications_enabled ?? true}
              onCheckedChange={(checked) => setField("whatsapp_notifications_enabled", !!checked)}
              className="mt-0.5"
            />
            <label htmlFor="whatsapp_notifications_enabled" className="cursor-pointer flex-1">
              <p className="text-sm font-medium">{t("settingsPage.autoWhatsappReminderLabel")}</p>
              <p className="text-xs text-muted-foreground">
                {t("settingsPage.autoWhatsappReminderDesc")}
              </p>
            </label>
          </div>

          <div className="space-y-1.5">
            <Label>{t("settingsPage.metaEventsLabel")}</Label>
            <p className="text-xs text-muted-foreground">
              {t("settingsPage.metaEventsDesc")}
            </p>
            <div className="grid gap-2 pt-1 sm:grid-cols-3">
              {(
                [
                  { key: "wa_notify_onay", label: t("settingsPage.eventOnCreate") },
                  { key: "wa_notify_revize", label: t("settingsPage.eventOnRevise") },
                  { key: "wa_notify_iptal", label: t("settingsPage.eventOnCancel") },
                ] as const
              ).map((ev) => {
                const settings = (org.settings_json ?? {}) as Record<string, unknown>;
                const checked = settings[ev.key] !== false; // default: işaretli
                return (
                  <label key={ev.key} className="flex items-center gap-2 p-2.5 rounded-lg border border-border text-sm cursor-pointer">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(c) => {
                        const cur = (org.settings_json ?? {}) as Record<string, unknown>;
                        setField("settings_json", { ...cur, [ev.key]: !!c });
                      }}
                    />
                    {ev.label}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("settingsPage.reminderOffsetLabel")}</Label>
            <p className="text-xs text-muted-foreground">{t("settingsPage.reminderOffsetDesc")}</p>
            <div className="flex flex-wrap gap-3 pt-1">
              {WA_REMINDER_OFFSET_PRESETS.map((h) => {
                const offsets = (org.wa_reminder_offsets_hours as number[] | undefined) ?? [2];
                const checked = offsets.includes(h);
                return (
                  <label key={h} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(c) => {
                        if (!c) return; // tekli seçim: mevcut seçili süre bırakılamaz, sadece değiştirilir
                        setField("wa_reminder_offsets_hours", [h]);
                      }}
                    />
                    {h < 24 ? t("settingsPage.hoursBefore", { h: String(h) }) : t("settingsPage.daysBefore", { d: String(h / 24) })}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Meta WhatsApp Şablon Seçimi */}
          <div className="pt-3 border-t border-border space-y-3">
            <Label className="text-sm font-medium">{t("settingsPage.metaTemplatesLabel")}</Label>
            <p className="text-xs text-muted-foreground">
              {t("settingsPage.metaTemplatesDesc")}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">{t("settingsPage.metaTemplateOnayLabel")}</Label>
                <Select
                  value={(org.wa_template_styles as Record<string, string> | null)?.onay || "sicak"}
                  onValueChange={(val) => {
                    const nextStyles = { ...((org.wa_template_styles as Record<string, string> | null) || {}), onay: val };
                    setField("wa_template_styles", nextStyles);
                  }}
                >
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sicak">randevu_onayi_1 ({t("settingsPage.templateStandard")})</SelectItem>
                    <SelectItem value="v2">randevu_onayi_2 ({t("settingsPage.templateVariant", { n: "2" })})</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground italic mt-1.5">
                  {metaPreview("onay", (org.wa_template_styles as Record<string, string> | null)?.onay || "sicak", {
                    customerName: t("settingsPage.sampleCustomerName"),
                    orgName: org.name || orgNameFallback,
                    businessPhone: org.phone || org.whatsapp_number || "",
                  })}
                </p>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">{t("settingsPage.metaTemplateIptalLabel")}</Label>
                <Select
                  value={(org.wa_template_styles as Record<string, string> | null)?.iptal || "sicak"}
                  onValueChange={(val) => {
                    const nextStyles = { ...((org.wa_template_styles as Record<string, string> | null) || {}), iptal: val };
                    setField("wa_template_styles", nextStyles);
                  }}
                >
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sicak">randevu_iptali ({t("settingsPage.templateStandard")})</SelectItem>
                    <SelectItem value="v1">randevu_iptali_1 ({t("settingsPage.templateVariant", { n: "1" })})</SelectItem>
                    <SelectItem value="v2">randevu_iptali_2 ({t("settingsPage.templateVariant", { n: "2" })})</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground italic mt-1.5">
                  {metaPreview("iptal", (org.wa_template_styles as Record<string, string> | null)?.iptal || "sicak", {
                    customerName: t("settingsPage.sampleCustomerName"),
                    orgName: org.name || orgNameFallback,
                    businessPhone: "",
                  })}
                </p>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">{t("settingsPage.metaTemplateHatirlatmaLabel")}</Label>
                <Select
                  value={(org.wa_template_styles as Record<string, string> | null)?.hatirlatma || "sicak"}
                  onValueChange={(val) => {
                    const nextStyles = { ...((org.wa_template_styles as Record<string, string> | null) || {}), hatirlatma: val };
                    setField("wa_template_styles", nextStyles);
                  }}
                >
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sicak">randevu_hatirlatma_1 ({t("settingsPage.templateStandard")})</SelectItem>
                    <SelectItem value="v1">randevu_hatirlatma_1 ({t("settingsPage.templateVariant", { n: "1" })})</SelectItem>
                    <SelectItem value="v2">randevu_hatirlatma_2 ({t("settingsPage.templateVariant", { n: "2" })})</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground italic mt-1.5">
                  {metaPreview("hatirlatma", (org.wa_template_styles as Record<string, string> | null)?.hatirlatma || "sicak", {
                    customerName: t("settingsPage.sampleCustomerName"),
                    orgName: org.name || orgNameFallback,
                    businessPhone: org.phone || org.whatsapp_number || "",
                  })}
                </p>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">{t("settingsPage.metaTemplateRevizeLabel")}</Label>
                <Select
                  value={(org.wa_template_styles as Record<string, string> | null)?.revize || "sicak"}
                  onValueChange={(val) => {
                    const nextStyles = { ...((org.wa_template_styles as Record<string, string> | null) || {}), revize: val };
                    setField("wa_template_styles", nextStyles);
                  }}
                >
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sicak">randevu_revize ({t("settingsPage.templateStandard")})</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground italic mt-1.5">
                  {metaPreview("revize", (org.wa_template_styles as Record<string, string> | null)?.revize || "sicak", {
                    customerName: t("settingsPage.sampleCustomerName"),
                    orgName: org.name || orgNameFallback,
                    businessPhone: "",
                  })}
                </p>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            {t("settingsPage.metaTemplatesFootnote")}
          </p>
        </div>
      </SectionCard>

      {/* SMS Bildirimleri */}
      <SectionCard
        icon={MessageSquareText}
        iconClassName="text-blue-600"
        title={t("settingsPage.smsNotifTitle")}
        description={t("settingsPage.smsNotifDesc")}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg border border-border">
            <Checkbox
              id="sms_notifications_enabled"
              checked={org.sms_notifications_enabled ?? false}
              onCheckedChange={(checked) => setField("sms_notifications_enabled", !!checked)}
              className="mt-0.5"
            />
            <label htmlFor="sms_notifications_enabled" className="cursor-pointer flex-1">
              <p className="text-sm font-medium">{t("settingsPage.smsEnabledLabel")}</p>
              <p className="text-xs text-muted-foreground">
                {t("settingsPage.smsEnabledDesc")}
              </p>
            </label>
          </div>

          <div>
            <Label>{t("settingsPage.smsProviderLabel")}</Label>
            <Select
              value={org.sms_provider ?? ""}
              onValueChange={(v) => setField("sms_provider", v || null)}
            >
              <SelectTrigger className="mt-1"><SelectValue placeholder={t("settingsPage.smsProviderPlaceholder")} /></SelectTrigger>
              <SelectContent>
                {SMS_PROVIDER_VALUES.map((v) => (
                  <SelectItem key={v} value={v}>{SMS_PROVIDER_LABELS[v]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {org.sms_provider && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>{smsProviderFieldLabels[org.sms_provider as SmsProviderValue]?.user}</Label>
                <Input
                  className="mt-1"
                  value={org.sms_username || ""}
                  onChange={(e) => setField("sms_username", e.target.value)}
                />
              </div>
              <div>
                <Label>{smsProviderFieldLabels[org.sms_provider as SmsProviderValue]?.pass}</Label>
                <Input
                  type="password"
                  className="mt-1"
                  value={org.sms_password || ""}
                  onChange={(e) => setField("sms_password", e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>{t("settingsPage.smsSenderLabel")}</Label>
                <Input
                  className="mt-1"
                  value={org.sms_sender_id || ""}
                  onChange={(e) => setField("sms_sender_id", e.target.value)}
                  placeholder={t("settingsPage.smsSenderPlaceholder")}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t("settingsPage.smsSenderHint")}
                </p>
              </div>
            </div>
          )}

          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-blue-700 dark:text-blue-400">{t("settingsPage.smsCostTitle")}</p>
            <p>{t("settingsPage.smsCostText")}</p>
          </div>
        </div>
      </SectionCard>

      {/* WhatsApp Business Bağlantısı — kampanya gönderimi + gelen mesajlara otomatik yanıt için */}
      <SectionCard
        icon={KeyRound}
        iconClassName="text-green-600"
        title={t("settingsPage.waBusinessConnTitle")}
        description={t("settingsPage.waBusinessConnDesc")}
      >
        <div className="space-y-3">
          <div>
            <Label>{t("settingsPage.waAccessTokenLabel")}</Label>
            <Input
              type="password"
              className="mt-1"
              value={org.wa_token || ""}
              onChange={(e) => setField("wa_token", e.target.value || null)}
              placeholder="Meta for Developers → WhatsApp → API Setup"
            />
          </div>
          <div>
            <Label>{t("settingsPage.waPhoneNumberIdLabel")}</Label>
            <Input
              className="mt-1"
              value={org.wa_phone_number_id || ""}
              onChange={(e) => setField("wa_phone_number_id", e.target.value || null)}
              placeholder={t("settingsPage.waPhoneNumberIdPlaceholder")}
            />
          </div>
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/50 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-green-700 dark:text-green-400">{t("settingsPage.waHowToTitle")}</p>
            <p>{t("settingsPage.waHowToText")}</p>
          </div>
        </div>
      </SectionCard>

      {/* KDV Hesaplama */}
      <SectionCard
        icon={Percent}
        iconClassName="text-amber-600"
        title={t("settingsPage.kdvTitle")}
        description={t("settingsPage.kdvDesc")}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg border border-border">
            <Checkbox
              id="kdv_enabled"
              checked={org.kdv_enabled ?? false}
              onCheckedChange={(checked) => setField("kdv_enabled", !!checked)}
              className="mt-0.5"
            />
            <label htmlFor="kdv_enabled" className="cursor-pointer flex-1">
              <p className="text-sm font-medium">{t("settingsPage.kdvEnabledLabel")}</p>
              <p className="text-xs text-muted-foreground">
                {t("settingsPage.kdvEnabledDesc")}
              </p>
            </label>
          </div>

          <div className="max-w-[160px]">
            <Label>{t("settingsPage.kdvRateLabel")}</Label>
            <Input
              className="mt-1"
              type="number"
              min="0"
              max="100"
              step="1"
              value={org.kdv_rate ?? 20}
              onChange={(e) => setField("kdv_rate", Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground mt-1">{t("settingsPage.kdvRateHint")}</p>
          </div>
        </div>
      </SectionCard>

      {/* KVKK / Yasal Bildirim */}
      <SectionCard
        icon={ShieldCheck}
        title={t("settingsPage.kvkkTitle")}
        description={t("settingsPage.kvkkDesc")}
      >
        <textarea
          className="w-full text-sm border border-border rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary min-h-[110px] bg-background"
          value={org.kvkk_notice_text ?? ""}
          onChange={(e) => setField("kvkk_notice_text", e.target.value)}
          placeholder={DEFAULT_KVKK_NOTICE_TEMPLATE.replaceAll("{salon}", org.name || orgNameFallback)}
        />
        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-[11px] font-medium text-muted-foreground mb-1">{t("settingsPage.kvkkPreviewLabel")}</p>
          <p className="text-xs text-muted-foreground italic">
            {renderKvkkNotice(org.kvkk_notice_text, org.name || orgNameFallback)}
          </p>
        </div>
      </SectionCard>

      {/* Uygulamayı telefona ekle (PWA) */}
      <InstallPwaCard />

      {/* Working hours */}
      <SectionCard icon={Clock} title={t("settingsPage.workingHoursTitle")} description={t("settingsPage.workingHoursDesc")}>
        <div className="space-y-2">
          {DAY_KEYS.map((dayKey) => {
            const hours = (org.working_hours_json as Record<string, { open: string; close: string } | null>)?.[dayKey];
            const isOpen = hours !== null && hours !== undefined;
            return (
              <div key={dayKey} className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const wh = { ...(org.working_hours_json as Record<string, unknown>) };
                    wh[dayKey] = isOpen ? null : { open: "09:00", close: "20:00" };
                    setField("working_hours_json", wh);
                  }}
                  className={`w-4 h-4 rounded border-2 transition-colors ${isOpen ? "bg-primary border-primary" : "border-border"}`}
                />
                <span className="w-24 text-sm font-medium">{t(`settingsPage.${DAY_LABEL_KEYS[dayKey]}`)}</span>
                {isOpen ? (
                  <>
                    <Input
                      type="time"
                      value={hours?.open || "09:00"}
                      onChange={(e) => {
                        const wh = { ...(org.working_hours_json as Record<string, unknown>) };
                        wh[dayKey] = { ...(hours || {}), open: e.target.value };
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
                        wh[dayKey] = { ...(hours || {}), close: e.target.value };
                        setField("working_hours_json", wh);
                      }}
                      className="w-28 text-sm"
                    />
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">{t("settingsPage.closedLabel")}</span>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Staff permissions */}
      <SectionCard icon={ShieldCheck} title={tsp("cardTitle")} description={tsp("cardDesc")}>
        {[
          {
            key: "staff_phone_access",
            label: tsp("phoneAccessLabel"),
            desc: tsp("phoneAccessDesc"),
            default: true,
          },
          {
            key: "staff_all_appointments",
            label: tsp("appointmentsAccessLabel"),
            desc: tsp("appointmentsAccessDesc"),
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

        <div className="pt-2 border-t border-border space-y-2">
          <p className="text-xs font-medium text-muted-foreground pt-2">
            {tsp("individualTitle")}
          </p>
          {staffList.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">{tsp("noStaff")}</p>
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
                  {tsp("editLink")}
                  <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            ))
          )}
        </div>
      </SectionCard>

      <SectionCard icon={ShieldCheck} title={t("settingsPage.legalSectionTitle")} description={t("settingsPage.legalSectionDesc")}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("settingsPage.legalBody")}
          </p>
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 rounded-full text-xs"
            onClick={() => setLegalNoticeModalOpen(true)}
          >
            <ShieldCheck className="h-4 w-4" />
            {t("settingsPage.legalNoticeButton")}
          </Button>
        </div>
      </SectionCard>

      <SectionCard icon={AlertTriangle} iconClassName="text-destructive" title={t("settingsPage.dangerZoneTitle")}>
        <p className="text-sm text-muted-foreground">
          {t("settingsPage.dangerZoneBody")}
        </p>
        <Button
          variant="destructive"
          className="w-full gap-2 rounded-full"
          onClick={() => setDeleteDialogOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
          {t("settingsPage.deleteAccountButton")}
        </Button>
      </SectionCard>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setDeleteConfirmText("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("settingsPage.deleteDialogTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("settingsPage.deleteDialogDescPre")}{" "}
              <strong>{DELETE_CONFIRM_PHRASE}</strong>{" "}
              {t("settingsPage.deleteDialogDescPost")}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder={DELETE_CONFIRM_PHRASE}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t("settingsPage.deleteCancelButton")}
            </Button>
            <Button
              variant="destructive"
              disabled={deleteConfirmText !== DELETE_CONFIRM_PHRASE || deletingAccount}
              onClick={handleDeleteAccount}
              className="gap-2"
            >
              {deletingAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {t("settingsPage.deleteConfirmButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button className="w-full gap-2 rounded-full" onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {t("settingsPage.saveButton")}
      </Button>

      <LegalNoticeModal isOpen={legalNoticeModalOpen} onOpenChange={setLegalNoticeModalOpen} />
    </div>
  );
}
