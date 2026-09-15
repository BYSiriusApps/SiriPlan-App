"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Building2, Mail, Lock, Phone, User, AlertCircle, CheckCircle2, Hash } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { InstallPwaCard } from "@/components/dashboard/InstallPwaCard";
import { TIMEZONE_OPTIONS } from "@/lib/timezones";
import { isValidTaxNumber, normalizeTaxNumber, TAX_NUMBER_MAX_LENGTH } from "@/lib/tax-number";

function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  return /android|iphone|ipad|ipod/i.test(navigator.userAgent);
}

const LOCALES = [
  { code: "tr", label: "TR", flag: "🇹🇷", name: "Türkçe" },
  { code: "en", label: "EN", flag: "🇬🇧", name: "English" },
  { code: "ru", label: "RU", flag: "🇷🇺", name: "Русский" },
  { code: "ar", label: "AR", flag: "🇸🇦", name: "العربية" },
];

const BUSINESS_TYPE_KEYS = [
  "kuafor", "berber", "guzellik", "spa", "nail",
  "estetik", "makyaj", "tattoo", "diyetisyen", "kas_kirpik",
] as const;

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

const PURCHASE_PLAN_KEYS = ["starter", "pro", "business"] as const;
type PurchasePlanKey = (typeof PURCHASE_PLAN_KEYS)[number];

/** Ülke kodu + yerel numarayı depolama biçimine indirger. TR (90) için mevcut
 * "0555..." formatı korunur (geri uyum); diğer ülkeler için "+" olmadan
 * ülke kodu + numara ("72445551234" gibi) — toWaPhone/normalizePhone bunu
 * zaten doğru işliyor. Kullanıcı yanlışlıkla başına 0 koysa bile temizlenir.
 */
function buildPhone(countryCode: string, localPhone: string) {
  const cc = countryCode.replace(/\D/g, "") || "90";
  const local = localPhone.replace(/\D/g, "").replace(/^0+/, "");
  return cc === "90" ? "0" + local : cc + local;
}

export default function KayitPage() {
  const t = useTranslations("auth.registerPage");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  // Başlangıç değeri "tr" — hydration uyuşmazlığı olmasın diye gerçek değer
  // aşağıdaki effect'te NEXT_LOCALE çerezinden okunur (bkz. Navbar.tsx'teki
  // aynı desen). Çerez zaten sunucunun kullandığı dille aynı, sadece bu buton
  // grubunun İLK boyamada yanlış dili aktif göstermesini engelliyor.
  const [selectedLocale, setSelectedLocale] = useState("tr");
  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
    if (match) setSelectedLocale(match[1]);
  }, []);
  const [form, setForm] = useState({
    salonName: "", type: "kuafor", fullName: "",
    email: "", phone: "", countryCode: "90", password: "",
    taxNumber: "",
    timezone: "Europe/Istanbul",
    // Honeypot — ekranda görünmez, sadece otomatik form doldurucular doldurur
    // (bkz. lib/bot-guard.ts). Sunucu bu alan doluysa kaydı reddeder.
    website: "",
  });
  // Formun açıldığı an — sunucu "insan bu formu 2.5 saniyeden kısa sürede
  // dolduramaz" kontrolü için kullanır.
  const formStartedAt = useRef<number>(Date.now());
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [taxError, setTaxError] = useState("");
  const [kvkkChecked, setKvkkChecked] = useState(false);
  const [gizlilikChecked, setGizlilikChecked] = useState(false);
  const [marketingChecked, setMarketingChecked] = useState(false);
  const [kvkkError, setKvkkError] = useState(false);
  // Bu e-posta/telefonla daha önce açılmış hesap için kalıcı yönlendirme kutusu.
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  // Fiyatlar sayfasındaki "doğrudan satın al" butonundan gelindiyse (?plan=...),
  // kayıt tamamlandığında panele değil doğrudan Stripe ödeme sayfasına yönlendirir
  // (bkz. components/marketing/PricingCards.tsx). useSearchParams yerine
  // window.location kullanılıyor — plan-sec sayfasındaki aynı desen (Suspense
  // sınırı gerektirmiyor).
  const [purchaseIntent, setPurchaseIntent] = useState<{ plan: PurchasePlanKey; annual: boolean } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const planParam = params.get("plan");
    if ((PURCHASE_PLAN_KEYS as readonly string[]).includes(planParam ?? "")) {
      setPurchaseIntent({ plan: planParam as PurchasePlanKey, annual: params.get("billing") === "annual" });
    }
  }, []);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    if (field === "email") setEmailError("");
    if (field === "phone" || field === "countryCode") setPhoneError("");
    if (field === "taxNumber") setTaxError("");
  }

  function validateEmail(email: string) {
    if (!EMAIL_RE.test(email)) {
      setEmailError(t("emailError"));
      return false;
    }
    setEmailError("");
    return true;
  }

  function validatePhone(phone: string, countryCode: string) {
    const digits = phone.replace(/\D/g, "");
    if (!digits) { setPhoneError(t("phoneErrorRequired")); return false; }
    const cc = countryCode.replace(/\D/g, "") || "90";
    if (cc === "90") {
      const local = digits.replace(/^0+/, "");
      if (!/^5\d{9}$/.test(local)) {
        setPhoneError(t("phoneErrorInvalidTr"));
        return false;
      }
    } else if (digits.length < 6 || digits.length > 14) {
      setPhoneError(t("phoneErrorInvalid"));
      return false;
    }
    setPhoneError("");
    return true;
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!validateEmail(form.email)) return;
    if (!validatePhone(form.phone, form.countryCode)) return;
    if (!isValidTaxNumber(form.taxNumber)) { setTaxError(t("taxNumberError")); toast.error(t("taxNumberError")); return; }
    if (form.password.length < 8) { toast.error(t("passwordTooShort")); return; }
    if (!form.salonName.trim()) { toast.error(t("salonNameRequired")); return; }
    if (!kvkkChecked || !gizlilikChecked) {
      setKvkkError(true);
      toast.error(t("consentRequiredToast"));
      return;
    }
    setKvkkError(false);

    setLoading(true);

    try {
      // Server-side registration — confirms email instantly, no verification email needed
      const res = await fetch("/api/auth/quick-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          salonName: form.salonName.trim(),
          fullName: form.fullName.trim(),
          phone: buildPhone(form.countryCode, form.phone),
          taxNumber: form.taxNumber || undefined,
          businessType: form.type,
          timezone: form.timezone,
          locale: selectedLocale,
          kvkkConsent: kvkkChecked,
          marketingConsent: marketingChecked,
          website: form.website,
          form_started_at: formStartedAt.current,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        // Daha önce açılmış hesap (deneme dolmuş ya da aktif) → toast yerine
        // kalıcı, "Giriş Yap" bağlantılı bir bilgi kutusu göster.
        if (data.code === "returning_expired" || data.code === "already_registered") {
          setAuthNotice(data.error);
          toast.error(data.error);
        } else {
          setAuthNotice(null);
          toast.error(data.error || t("registrationFailed"));
        }
        setLoading(false);
        return;
      }
      setAuthNotice(null);

      // Now sign in with the created credentials
      const supabase = createClient();
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (signInErr) {
        toast.error(t("signInFailed", { message: signInErr.message }));
        router.push("/auth/giris");
        return;
      }

      toast.success(t("successToast"));

      // Doğrudan satın alma niyetiyle gelindiyse (fiyatlar sayfası → ?plan=...)
      // panele/PWA ekranına hiç uğramadan Stripe ödeme sayfasına yönlendir.
      if (purchaseIntent) {
        try {
          const checkoutRes = await fetch("/api/stripe/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plan: purchaseIntent.plan, annual: purchaseIntent.annual }),
          });
          const checkoutData = await checkoutRes.json();
          if (checkoutRes.ok && checkoutData.url) {
            window.location.href = checkoutData.url;
            return;
          }
        } catch {
          // yut ve aşağıdaki normal akışa (panel) düş
        }
        toast.error(t("checkoutFailed"));
      }

      // Mobil cihazlarda paneline gitmeden önce "ana ekrana ekle" kısayolunu öner
      if (isMobileDevice()) {
        setRegistered(true);
        setLoading(false);
        return;
      }

      window.location.href = "/dashboard";
    } catch {
      toast.error(t("genericError"));
      setLoading(false);
    }
  }

  if (registered) {
    return (
      <div className="space-y-4">
        <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm">
          <CardContent className="pt-6 text-center space-y-2">
            <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
            <CardTitle className="text-xl">{t("successTitle")}</CardTitle>
            <CardDescription>
              {t("successDesc")}
            </CardDescription>
          </CardContent>
        </Card>

        <InstallPwaCard />

        <Button className="w-full" onClick={() => { window.location.href = "/dashboard"; }}>
          {t("goToPanel")}
        </Button>
      </div>
    );
  }

  return (
    <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm">
      <CardHeader className="text-center pb-2">
        <div className="flex justify-end mb-1">
          <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
            {LOCALES.map((l) => (
              <button
                key={l.code}
                type="button"
                title={l.name}
                onClick={() => {
                  setSelectedLocale(l.code);
                  document.cookie = `NEXT_LOCALE=${l.code};path=/;max-age=31536000;samesite=lax`;
                  router.refresh();
                }}
                className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-all ${
                  selectedLocale === l.code
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="text-sm leading-none">{l.flag}</span>
                <span>{l.label}</span>
              </button>
            ))}
          </div>
        </div>
        <CardTitle className="text-2xl">{purchaseIntent ? t("titlePurchase") : t("title")}</CardTitle>
        <CardDescription>{purchaseIntent ? t("subtitlePurchase") : t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        {authNotice && (
          <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 p-3.5 text-sm">
            <p className="text-amber-800 dark:text-amber-300 leading-relaxed">{authNotice}</p>
            <Link
              href={`/auth/giris?identifier=${encodeURIComponent(form.email || buildPhone(form.countryCode, form.phone))}`}
              className="mt-2.5 inline-flex items-center justify-center rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 transition-colors"
            >
              {t("loginLinkCta")} →
            </Link>
          </div>
        )}
        <form onSubmit={handleRegister} className="space-y-3">
          {/*
            Honeypot: görsel olarak yok, klavye sırasında yok, ekran okuyucudan
            gizli. Gerçek kullanıcı asla dolduramaz; spam botları neredeyse her
            zaman doldurur ve sunucu tarafında kayıt sessizce reddedilir.
          */}
          <input
            type="text"
            name="website"
            value={form.website}
            onChange={(e) => set("website", e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
          />
          <div className="space-y-1.5">
            <Label>{t("businessTypeLabel")}</Label>
            <Select value={form.type} onValueChange={(v) => set("type", v ?? "kuafor")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BUSINESS_TYPE_KEYS.map((key) => (
                  <SelectItem key={key} value={key}>{t(`businessTypes.${key}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{t("salonNameLabel")}</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t("salonNamePlaceholder")} className="pl-9" value={form.salonName}
                onChange={(e) => set("salonName", e.target.value)} required minLength={2} maxLength={60} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>
              {t("taxNumberLabel")}{" "}
              <span className="text-xs font-normal text-muted-foreground">{t("optional")}</span>
            </Label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                inputMode="numeric"
                placeholder={t("taxNumberPlaceholder")}
                className={`pl-9 ${taxError ? "border-red-500" : ""}`}
                value={form.taxNumber}
                onChange={(e) => set("taxNumber", normalizeTaxNumber(e.target.value))}
                onBlur={() => { if (!isValidTaxNumber(form.taxNumber)) setTaxError(t("taxNumberError")); }}
                maxLength={TAX_NUMBER_MAX_LENGTH}
              />
            </div>
            {taxError
              ? <p className="text-xs text-red-500 mt-0.5">{taxError}</p>
              : <p className="text-xs text-muted-foreground">{t("taxNumberHelp")}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>{t("fullNameLabel")}</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t("fullNamePlaceholder")} className="pl-9" value={form.fullName}
                onChange={(e) => set("fullName", e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("emailLabel")}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="email" inputMode="email" placeholder={t("emailPlaceholder")}
                  className={`pl-9 ${emailError ? "border-red-500" : ""}`}
                  value={form.email} onChange={(e) => set("email", e.target.value)}
                  onBlur={() => form.email && validateEmail(form.email)}
                  required autoComplete="email" />
              </div>
              {emailError && <p className="text-xs text-red-500 mt-0.5">{emailError}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>{t("phoneLabel")} <span className="text-red-500">*</span></Label>
              <div className="flex gap-1.5">
                <div className="relative w-[4.5rem] shrink-0">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">+</span>
                  <Input inputMode="numeric" placeholder="90" title={t("countryCodeTitle")}
                    className="pl-4 pr-1 text-center"
                    value={form.countryCode}
                    onChange={(e) => set("countryCode", e.target.value.replace(/\D/g, "").slice(0, 4))}
                    maxLength={4} required />
                </div>
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="tel" inputMode="tel" placeholder={t("phonePlaceholder")}
                    className={`pl-9 ${phoneError ? "border-red-500" : ""}`}
                    value={form.phone} onChange={(e) => set("phone", e.target.value)}
                    onBlur={() => form.phone && validatePhone(form.phone, form.countryCode)} required />
                </div>
              </div>
              {phoneError && <p className="text-xs text-red-500 mt-0.5">{phoneError}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("timezoneLabel")}</Label>
            <Select value={form.timezone} onValueChange={(v) => set("timezone", v ?? "Europe/Istanbul")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIMEZONE_OPTIONS.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{t("timezoneHelp")}</p>
          </div>

          <div className="space-y-1.5">
            <Label>{t("passwordLabel")}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="password" placeholder={t("passwordPlaceholder")} className="pl-9"
                value={form.password} onChange={(e) => set("password", e.target.value)}
                minLength={8} required autoComplete="new-password" />
            </div>
          </div>

          {/* KVKK & consent checkboxes */}
          <div className={`space-y-2.5 rounded-lg border p-3 text-sm ${kvkkError ? "border-red-400 bg-red-50 dark:bg-red-950/20" : "border-border bg-muted/30"}`}>
            <div className="flex items-start gap-2.5">
              <Checkbox
                id="kvkk"
                checked={kvkkChecked}
                onCheckedChange={(v) => { setKvkkChecked(!!v); if (v) setKvkkError(false); }}
                className="mt-0.5 shrink-0"
              />
              <label htmlFor="kvkk" className="leading-snug cursor-pointer">
                {t.rich("kvkkLabel", {
                  link: (chunks) => (
                    <Link href="/kvkk" target="_blank" className="text-primary font-medium hover:underline">{chunks}</Link>
                  ),
                })}{" "}
                <span className="text-red-500 font-medium">*</span>
              </label>
            </div>

            <div className="flex items-start gap-2.5">
              <Checkbox
                id="gizlilik"
                checked={gizlilikChecked}
                onCheckedChange={(v) => { setGizlilikChecked(!!v); if (v) setKvkkError(false); }}
                className="mt-0.5 shrink-0"
              />
              <label htmlFor="gizlilik" className="leading-snug cursor-pointer">
                {t.rich("privacyLabel", {
                  privacyLink: (chunks) => (
                    <Link href="/gizlilik" target="_blank" className="text-primary font-medium hover:underline">{chunks}</Link>
                  ),
                  termsLink: (chunks) => (
                    <Link href="/kosullar" target="_blank" className="text-primary font-medium hover:underline">{chunks}</Link>
                  ),
                })}{" "}
                <span className="text-red-500 font-medium">*</span>
              </label>
            </div>

            <div className="flex items-start gap-2.5">
              <Checkbox
                id="marketing"
                checked={marketingChecked}
                onCheckedChange={(v) => setMarketingChecked(!!v)}
                className="mt-0.5 shrink-0"
              />
              <label htmlFor="marketing" className="leading-snug cursor-pointer text-muted-foreground">
                {t("marketingLabel")}{" "}
                <span className="text-xs">{t("optional")}</span>
              </label>
            </div>

            {kvkkError && (
              <p className="flex items-center gap-1 text-xs text-red-500 mt-1">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {t("consentRequired")}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {loading ? t("submitLoading") : purchaseIntent ? t("submitPurchase") : t("submit")}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {t("hasAccount")}{" "}
            <Link href="/auth/giris" className="text-primary font-medium hover:underline">{t("loginLink")}</Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
