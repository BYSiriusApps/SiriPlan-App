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
import { TIMEZONE_OPTIONS } from "@/lib/timezones";
import { DEFAULT_WA_TEMPLATE, WA_TEMPLATE_VARS, renderWaTemplate } from "@/lib/wa-template";
import {
  DEFAULT_WA_TEMPLATE_STYLES,
  WA_REMINDER_OFFSET_PRESETS,
} from "@/lib/wa-templates/registry";
import { DEFAULT_KVKK_NOTICE_TEMPLATE, renderKvkkNotice } from "@/lib/kvkk";
import { isValidTaxNumber, normalizeTaxNumber, TAX_NUMBER_ERROR, TAX_NUMBER_MAX_LENGTH } from "@/lib/tax-number";
import QRCode from "qrcode";

const APPOINTMENT_TEMPLATE_PRESETS: { key: string; label: string; text: string }[] = [
  {
    key: "sicak",
    label: "Sıcak",
    text: "Sayın {musteri}, {salon} işletmesinde {tarih} tarihi ve {saat} saati için randevunuz oluşturulmuştur. Sorunuz olursa bu numaradan bize ulaşabilirsiniz. Görüşmek üzere! 💫",
  },
  {
    key: "kisa",
    label: "Kısa",
    text: "{musteri}, {salon} - {tarih} {saat} randevunuz onaylandı.",
  },
  {
    key: "resmi",
    label: "Resmi",
    text: "Sayın {musteri}, {salon} nezdinde {tarih} tarihinde saat {saat} için randevunuz kayıt altına alınmıştır. Bilginize sunarız.",
  },
  {
    key: "hizmetli",
    label: "Hizmet Detaylı",
    text: "Merhaba {musteri}, {hizmet} hizmeti için {tarih} {saat} randevunuz {personel} ile {salon}'da oluşturuldu. Bekliyoruz!",
  },
];

const SMS_PROVIDERS: { value: "netgsm" | "vatansms" | "iletimerkezi"; label: string; userLabel: string; passLabel: string }[] = [
  { value: "netgsm", label: "Netgsm", userLabel: "Kullanıcı Kodu", passLabel: "Şifre / API Şifresi" },
  { value: "vatansms", label: "VatanSMS", userLabel: "API ID", passLabel: "API Key" },
  { value: "iletimerkezi", label: "İletimerkezi", userLabel: "Kullanıcı Adı", passLabel: "Şifre" },
];

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

const DELETE_CONFIRM_PHRASE = "HESABIMI SİL";

export default function AyarlarPage() {
  const t = useTranslations("dashboard");
  const tsp = useTranslations("dashboard.staffPermissions");
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
  // Native uygulamada mağaza kuralları gereği plan yükseltme çağrısı gösterilmez.
  const mobileApp = useIsMobileApp();

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
        toast.error(data.error || "Hesap silinemedi, lütfen destek ile iletişime geçin");
        setDeletingAccount(false);
        return;
      }
      toast.success("Hesabınız silindi");
      const supabase = createClient();
      await supabase.auth.signOut().catch(() => {});
      router.push("/auth/giris");
    } catch {
      toast.error("Hesap silinemedi, lütfen destek ile iletişime geçin");
      setDeletingAccount(false);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast.error("Tarayıcınız konum özelliğini desteklemiyor");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setField("location_url", `https://www.google.com/maps?q=${latitude},${longitude}`);
        setLocating(false);
        toast.success("Konumunuz alındı");
      },
      () => {
        setLocating(false);
        toast.error("Konum alınamadı — tarayıcınızdan konum izni vermeniz gerekiyor");
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
      toast.error(TAX_NUMBER_ERROR);
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

    // tax_number kolonu henüz uygulanmamışsa (migration sırası) yalnızca bu alan
    // düşürülüp aynı payload tekrar denenir — tüm ayarlar sayfası tek bir yeni
    // alan yüzünden kaydedilemez hâle gelmemeli.
    if (error && /tax_number/.test(error.message)) {
      delete payload.tax_number;
      ({ error } = await supabase.from("organizations").update(payload).eq("id", org.id!));
    }

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

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !org?.id) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Lütfen bir resim dosyası seçin");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Dosya boyutu 2MB'dan küçük olmalı");
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
      toast.error("Yükleme başarısız: " + upErr.message);
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
      toast.error("Kaydedilemedi: " + dbErr.message);
    } else {
      setField("logo_url", publicUrl);
      toast.success("Logo güncellendi!");
    }
    setUploadingLogo(false);
  }

  async function handleLogoRemove() {
    if (!org?.id) return;
    const supabase = createClient();
    const { error } = await supabase.from("organizations").update({ logo_url: null }).eq("id", org.id);
    if (error) {
      toast.error("Kaldırılamadı: " + error.message);
    } else {
      setField("logo_url", null);
      toast.success("Logo kaldırıldı");
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
      toast.success("Link kopyalandı!");
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error("Link kopyalanamadı, elle seçip kopyalayın.");
    }
  }

  function shareBookingLinkOnWhatsApp() {
    if (!bookingLink) return;
    const text = `${org?.name || "Salonumuz"} için online randevu almak isterseniz: ${bookingLink}`;
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
            <h1 className="text-2xl sm:text-3xl font-bold brand-gradient-text leading-tight">{t("settings")}</h1>
            <HomeButton />
          </div>
          <p className="text-sm text-muted-foreground mt-1">{t("settingsSubtitle")}</p>
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
          <p className="font-semibold text-sm">Abonelik &amp; Fatura</p>
          <p className="text-xs text-muted-foreground">Plan, kullanım limitleri ve ödeme yönetimi</p>
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
            <Label>İşletme Logosu</Label>
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
            <p className="text-[11px] text-muted-foreground">PNG, JPG veya WebP — en fazla 2MB. Randevu sayfanızda görünür.</p>
          </div>
        </div>
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
            <Input className="mt-1" value={org.phone || ""} onChange={(e) => setField("phone", e.target.value)} placeholder="5xx xxx xx xx" />
          </div>
          <div>
            <Label>E-posta</Label>
            <Input className="mt-1" type="email" value={org.email || ""} onChange={(e) => setField("email", e.target.value)} />
          </div>
        </div>
        <div>
          <Label>
            VKN / TC Kimlik No{" "}
            <span className="text-xs font-normal text-muted-foreground">(isteğe bağlı)</span>
          </Label>
          <Input
            className="mt-1"
            inputMode="numeric"
            maxLength={TAX_NUMBER_MAX_LENGTH}
            value={org.tax_number || ""}
            onChange={(e) => setField("tax_number", normalizeTaxNumber(e.target.value))}
            placeholder="Vergi No (10 hane) veya TCKN (11 hane)"
          />
          {org.tax_number && !isValidTaxNumber(org.tax_number) && (
            <p className="text-xs text-red-500 mt-1">{TAX_NUMBER_ERROR}</p>
          )}
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
        <div>
          <Label>Saat Dilimi</Label>
          <Select value={org.timezone || "Europe/Istanbul"} onValueChange={(v) => setField("timezone", v ?? "Europe/Istanbul")}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIMEZONE_OPTIONS.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">Çalışma saatleri, müsaitlik ve randevu bildirimleri bu saat dilimine göre hesaplanır.</p>
        </div>
        <div className="space-y-1">
          <Label>Konum (Google Maps Linki)</Label>
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
          <p className="text-[11px] text-muted-foreground">
            Google Maps&apos;te işletmenizi bulup <strong>Paylaş</strong> ile linki kopyalayıp buraya yapıştırın —
            otomatik randevu onay mesajlarında müşteriye bu linke tıklayarak gelebileceği doğru konum gösterilir.
            Boş bırakırsanız adresinizden otomatik bir harita linki üretilir.
          </p>
        </div>
      </SectionCard>

      {/* Online randevu linki */}
      <SectionCard
        icon={CalendarCheck}
        iconClassName="text-rose-600"
        title={t("settingsPage.bookingLinkTitle")}
        description="Bu linki sosyal medya biyografinize veya WhatsApp'tan müşterilerinize paylaşın. Müşterileriniz boş saatleri görüp kendileri randevu alabilir; onayladıkları KVKK metniyle birlikte otomatik olarak müşteri listenize eklenirler."
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
                QR kod ile paylaş
              </summary>
              <div className="mt-2 flex items-center gap-3 p-3 rounded-lg border border-border bg-white w-fit">
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrDataUrl} alt="Randevu linki QR kodu" width={160} height={160} />
                ) : (
                  <div className="h-[160px] w-[160px] flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}
                <p className="text-xs text-muted-foreground max-w-[140px]">
                  Salonunuzda basılı olarak asabilir, müşterileriniz telefonla okutarak direkt randevu sayfanıza ulaşabilir.
                </p>
              </div>
            </details>

            {org.plan !== "pro" && org.plan !== "business" && !mobileApp && (
              <div className="flex items-start gap-3 p-3.5 rounded-xl border border-primary/30 bg-primary/5">
                <Globe className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">Randevu sayfanızı web sitesine dönüştürün →</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Renk paleti, kapak fotoğrafı, hizmet kategorileri ve fotoğraflarla donatılmış,
                    satış artırıcı bir işletme sayfası — mevcut randevu linkinizde, ek bir adres olmadan.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2.5">
                    <Link
                      href="/dashboard/abonelik"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      Pro Plana Geç
                    </Link>
                    <a
                      href="/r/sirius-demo-salon"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors"
                    >
                      Örnek Web Sitesini Görüntüle
                    </a>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Randevu linkiniz oluşturulamadı, lütfen destek ekibiyle iletişime geçin.</p>
        )}
      </SectionCard>

      {/* Integrations */}
      <SectionCard icon={Link2} title={t("settingsPage.integrationsTitle")}>
        <div>
          <Label>Instagram Kullanıcı Adı</Label>
          <div className="flex mt-1">
            <span className="px-3 py-2 border border-r-0 rounded-l-lg bg-muted text-muted-foreground text-sm">@</span>
            <Input className="rounded-l-none" value={org.instagram_handle || ""} onChange={(e) => setField("instagram_handle", e.target.value)} placeholder="salonadınız" />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Website modu açıksa randevu sayfanızda ikon olarak gösterilir.</p>
        </div>
        <div>
          <Label>TikTok Kullanıcı Adı</Label>
          <div className="flex mt-1">
            <span className="px-3 py-2 border border-r-0 rounded-l-lg bg-muted text-muted-foreground text-sm">@</span>
            <Input className="rounded-l-none" value={org.tiktok_handle || ""} onChange={(e) => setField("tiktok_handle", e.target.value)} placeholder="salonadınız" />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Website modu açıksa randevu sayfanızda ikon olarak gösterilir.</p>
        </div>
        <div>
          <Label>WhatsApp Numarası (Müşterilere gösterilecek)</Label>
          <Input className="mt-1" value={org.whatsapp_number || ""} onChange={(e) => setField("whatsapp_number", e.target.value)} placeholder="+90 5xx xxx xxxx" />
        </div>
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50 border border-border">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">WhatsApp Business</p>
            <p className="text-xs text-muted-foreground">
              Entegrasyon için{" "}
              <a href="mailto:info@bysirius.com" className="text-primary hover:underline">destek ekibi</a>
              {" "}ile iletişime geçin.
            </p>
          </div>
        </div>

        <div className="pt-1 space-y-2">
          <Label className="flex items-center gap-1.5">
            <Send className="h-3.5 w-3.5 text-primary" />
            Telegram Bildirimleri (Chat ID)
          </Label>
          <Input
            className="mt-1"
            value={org.telegram_chat_id || ""}
            onChange={(e) => setField("telegram_chat_id", e.target.value)}
            placeholder="123456789"
          />
          <p className="text-xs text-muted-foreground">
            Yeni bir randevu oluştuğunda (online veya elle) buraya anında Telegram bildirimi gönderilir.
          </p>
          <details className="group">
            <summary className="text-xs text-primary cursor-pointer select-none w-fit hover:underline">
              Chat ID&apos;mi nasıl bulurum?
            </summary>
            <ol className="mt-2 text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Telegram&apos;da salonumuzun bildirim botunu bulup <strong>Başlat / Start</strong>&apos;a basın.</li>
              <li>Bot size bir Chat ID numarası gönderecek.</li>
              <li>Bu numarayı yukarıya yapıştırıp kaydedin — artık her randevuda bildirim alırsınız.</li>
            </ol>
          </details>
        </div>
      </SectionCard>

      {/* Otomatik randevu mesajı */}
      <SectionCard
        icon={MessageCircle}
        iconClassName="text-green-600"
        title={t("settingsPage.autoMessageTitle")}
        description="Randevu ekranlarındaki (Yeni Randevu / Hızlı Randevu) 'Müşteriye WhatsApp mesajı gönder' kutusu işaretlendiğinde kendi WhatsApp'ınızdan elle gönderdiğiniz metin budur. Tarih ve saat her randevuda otomatik doldurulur."
      >
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Bu, aşağıdaki <strong>&quot;WhatsApp Bildirim Ayarları&quot;</strong> bölümündeki Meta otomatik
            onay mesajından farklı bir kanaldır. İkisi birlikte açıksa müşteri aynı bilgiyi iki kez
            alabilir — birini kapalı tutmanız önerilir.
          </p>
        </div>
        <div className="flex gap-1.5 flex-wrap items-center">
          <span className="text-xs text-muted-foreground">Şablon seç:</span>
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
      </SectionCard>

      {/* Online randevu — otomatik onay */}
      <SectionCard
        icon={CalendarCheck}
        title={t("settingsPage.onlineBookingSettingsTitle")}
        description="Online randevu sayfanızdan (/r/...) gelen randevular varsayılan olarak otomatik onaylanır ve takvime düşer."
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
              <p className="text-sm font-medium">Online randevuları otomatik onayla</p>
              <p className="text-xs text-muted-foreground">
                Açıksa online sayfadan gelen randevular beklemeden direkt onaylanır ve takvime düşer.
                Kapatırsanız, randevular siz onaylayana kadar &quot;bekliyor&quot; kuyruğunda tutulur
                (manuel onay kuyruğu Pro/Business planına özeldir).
              </p>
            </label>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground">
            Online randevularınız otomatik onaylanıp takvime düşer. Randevuları onaylamadan önce
            gözden geçirmek isterseniz, bu manuel onay kuyruğu Pro veya Business planında kullanılabilir.
          </div>
        )}
      </SectionCard>

      {/* WhatsApp Bildirim Ayarları (hatırlatma / iptal) */}
      <SectionCard
        icon={MessageCircle}
        iconClassName="text-green-600"
        title={t("settingsPage.whatsappNotifTitle")}
        description="Randevu saatine yaklaşırken otomatik gönderilen hatırlatma ve iptal mesajlarının altına eklenen özel not."
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
              <p className="text-sm font-medium">Otomatik WhatsApp hatırlatmaları açık</p>
              <p className="text-xs text-muted-foreground">
                Kapatırsanız aşağıda seçili süre için giden otomatik hatırlatma mesajları gönderilmez.
              </p>
            </label>
          </div>

          <div className="space-y-1.5">
            <Label>Meta üzerinden hangi işlemlerde otomatik WhatsApp mesajı gönderilsin?</Label>
            <p className="text-xs text-muted-foreground">
              Bu mesajlar Sirius&apos;un ortak WhatsApp Business numarasından, Meta onaylı şablonla otomatik
              gider. Bir olayı kapatırsanız o olay için otomatik mesaj gitmez — dilerseniz randevu
              ekranındaki &quot;Müşteriye WhatsApp mesajı gönder&quot; kutusuyla kendi WhatsApp&apos;ınızdan
              elle gönderebilirsiniz. İkisini birden açık tutmayın, aksi halde müşteri aynı bilgiyi iki kez alır.
            </p>
            <div className="grid gap-2 pt-1 sm:grid-cols-3">
              {(
                [
                  { key: "wa_notify_onay", label: "Randevu oluşturulunca" },
                  { key: "wa_notify_revize", label: "Randevu revize edilince" },
                  { key: "wa_notify_iptal", label: "Randevu iptal edilince" },
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
            <Label>Hatırlatma randevudan kaç saat önce gönderilsin?</Label>
            <p className="text-xs text-muted-foreground">Tek bir süre seçebilirsiniz — seçtiğinizde diğerleri pasif olur.</p>
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
                    {h < 24 ? `${h} saat önce` : `${h / 24} gün önce`}
                  </label>
                );
              })}
            </div>
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
        </div>
      </SectionCard>

      {/* SMS Bildirimleri */}
      <SectionCard
        icon={MessageSquareText}
        iconClassName="text-blue-600"
        title={t("settingsPage.smsNotifTitle")}
        description="Randevu onayı, hatırlatma ve iptal bildirimlerini SMS ile de gönderebilirsiniz. Bunun için bir SMS sağlayıcısında (Netgsm, VatanSMS veya İletimerkezi) hesap açıp API bilgilerinizi buraya girmeniz gerekir."
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
              <p className="text-sm font-medium">SMS bildirimleri açık</p>
              <p className="text-xs text-muted-foreground">
                Kapalıyken randevu detayındaki &quot;SMS Gönder&quot; butonları çalışmaz.
              </p>
            </label>
          </div>

          <div>
            <Label>SMS Sağlayıcısı</Label>
            <Select
              value={org.sms_provider ?? ""}
              onValueChange={(v) => setField("sms_provider", v || null)}
            >
              <SelectTrigger className="mt-1"><SelectValue placeholder="Sağlayıcı seçin" /></SelectTrigger>
              <SelectContent>
                {SMS_PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {org.sms_provider && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>{SMS_PROVIDERS.find((p) => p.value === org.sms_provider)?.userLabel}</Label>
                <Input
                  className="mt-1"
                  value={org.sms_username || ""}
                  onChange={(e) => setField("sms_username", e.target.value)}
                />
              </div>
              <div>
                <Label>{SMS_PROVIDERS.find((p) => p.value === org.sms_provider)?.passLabel}</Label>
                <Input
                  type="password"
                  className="mt-1"
                  value={org.sms_password || ""}
                  onChange={(e) => setField("sms_password", e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Gönderici Başlığı (Sender ID)</Label>
                <Input
                  className="mt-1"
                  value={org.sms_sender_id || ""}
                  onChange={(e) => setField("sms_sender_id", e.target.value)}
                  placeholder="Operatörce onaylı marka başlığınız"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Sağlayıcı panelinizden operatöre onaylattığınız başlık — onaysız gönderimde SMS reddedilir.
                </p>
              </div>
            </div>
          )}

          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-blue-700 dark:text-blue-400">Maliyet hakkında</p>
            <p>SMS başına yaklaşık 0,08–0,20 TL arası (paket boyutuna göre) — sağlayıcı sitesinden kredi paketi satın almanız gerekir, aylık sabit ücret yoktur.</p>
          </div>
        </div>
      </SectionCard>

      {/* WhatsApp Business Bağlantısı — kampanya gönderimi + gelen mesajlara otomatik yanıt için */}
      <SectionCard
        icon={KeyRound}
        iconClassName="text-green-600"
        title="WhatsApp Business Bağlantısı"
        description="Randevu onay/hatırlatma/iptal mesajları Siriplan'ın kendi WhatsApp hattından otomatik gider, bunun için bir şey yapmanıza gerek yok. Aşağıdaki bağlantı yalnızca Kampanyalar modülünden gönderdiğiniz pazarlama mesajlarının ve gelen mesajlara otomatik yanıtın kendi WhatsApp Business numaranızdan gitmesi içindir."
      >
        <div className="space-y-3">
          <div>
            <Label>Kalıcı Erişim Belirteci (Access Token)</Label>
            <Input
              type="password"
              className="mt-1"
              value={org.wa_token || ""}
              onChange={(e) => setField("wa_token", e.target.value || null)}
              placeholder="Meta for Developers → WhatsApp → API Setup"
            />
          </div>
          <div>
            <Label>Telefon Numarası Kimliği (Phone Number ID)</Label>
            <Input
              className="mt-1"
              value={org.wa_phone_number_id || ""}
              onChange={(e) => setField("wa_phone_number_id", e.target.value || null)}
              placeholder="örn. 109876543210987"
            />
          </div>
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/50 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-green-700 dark:text-green-400">Nasıl alınır?</p>
            <p>
              <a href="https://business.facebook.com/wa/manage/home" target="_blank" rel="noopener noreferrer" className="underline">
                Meta Business Suite
              </a>{" "}
              üzerinden bir WhatsApp Business hesabı bağlayıp{" "}
              <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="underline">
                Meta for Developers
              </a>{" "}
              &gt; uygulamanız &gt; WhatsApp &gt; API Setup sayfasından kalıcı erişim belirtecini ve telefon numarası kimliğini kopyalayın.
              Bu alanlar boşken kampanyalarınız WhatsApp kanalında gönderilemez (SMS kanalını kullanabilirsiniz).
            </p>
          </div>
        </div>
      </SectionCard>

      {/* KDV Hesaplama */}
      <SectionCard
        icon={Percent}
        iconClassName="text-amber-600"
        title="KDV Hesaplama"
        description="Gelir & Gider raporlarında tahmini KDV tutarını görmek için oranınızı girin. Girdiğiniz gelir tutarlarının KDV dahil olduğu varsayılır."
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
              <p className="text-sm font-medium">KDV hesaplaması açık</p>
              <p className="text-xs text-muted-foreground">
                Açıkken Gelir & Gider sayfasında tahmini KDV tutarı gösterilir.
              </p>
            </label>
          </div>

          <div className="max-w-[160px]">
            <Label>KDV Oranı (%)</Label>
            <Input
              className="mt-1"
              type="number"
              min="0"
              max="100"
              step="1"
              value={org.kdv_rate ?? 20}
              onChange={(e) => setField("kdv_rate", Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground mt-1">Türkiye&apos;de genel oran %20&apos;dir.</p>
          </div>
        </div>
      </SectionCard>

      {/* KVKK / Yasal Bildirim */}
      <SectionCard
        icon={ShieldCheck}
        title={t("settingsPage.kvkkTitle")}
        description="Müşterilerinize randevu alırken gösterilecek KVKK aydınlatma metni. Boş bırakırsanız platform varsayılan metni kullanılır."
      >
        <textarea
          className="w-full text-sm border border-border rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary min-h-[110px] bg-background"
          value={org.kvkk_notice_text ?? ""}
          onChange={(e) => setField("kvkk_notice_text", e.target.value)}
          placeholder={DEFAULT_KVKK_NOTICE_TEMPLATE.replaceAll("{salon}", org.name || "Salonunuz")}
        />
        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-[11px] font-medium text-muted-foreground mb-1">Müşteriye gösterilecek metin:</p>
          <p className="text-xs text-muted-foreground italic">
            {renderKvkkNotice(org.kvkk_notice_text, org.name || "Salonunuz")}
          </p>
        </div>
      </SectionCard>

      {/* Uygulamayı telefona ekle (PWA) */}
      <InstallPwaCard />

      {/* Working hours */}
      <SectionCard icon={Clock} title={t("settingsPage.workingHoursTitle")} description="Kapalı günler için açma/kapama saatlerini boş bırakın">
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

      <SectionCard icon={AlertTriangle} iconClassName="text-destructive" title="Tehlikeli Bölge">
        <p className="text-sm text-muted-foreground">
          Hesabınızı sildiğinizde giriş bilgileriniz ve işletmenizin tüm personel erişimleri kalıcı olarak
          kapatılır, aboneliğiniz iptal edilir. Müşteri kayıtlarınız silinmez, kişisel tanımlayıcı bilgileri
          (isim, telefon, e-posta) anonimleştirilir; randevu/ciro geçmişi yasal muhasebe saklama süresi
          boyunca istatistiksel olarak tutulmaya devam eder. Bu işlem geri alınamaz.
        </p>
        <Button
          variant="destructive"
          className="w-full gap-2 rounded-full"
          onClick={() => setDeleteDialogOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
          Hesabımı Sil
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
            <DialogTitle>Hesabını silmek üzeresin</DialogTitle>
            <DialogDescription>
              Bu işlem geri alınamaz. Onaylamak için aşağıya <strong>{DELETE_CONFIRM_PHRASE}</strong> yazın.
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
              Vazgeç
            </Button>
            <Button
              variant="destructive"
              disabled={deleteConfirmText !== DELETE_CONFIRM_PHRASE || deletingAccount}
              onClick={handleDeleteAccount}
              className="gap-2"
            >
              {deletingAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Kalıcı Olarak Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button className="w-full gap-2 rounded-full" onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {t("settingsPage.saveButton")}
      </Button>
    </div>
  );
}
