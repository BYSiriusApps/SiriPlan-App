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
import {
  Loader2, Building2, Mail, Lock, Phone, User, AlertCircle, CheckCircle2, Hash,
  Scissors, Sparkles, Flower2, Hand, Droplets, Palette, PenTool, Apple, Eye, PawPrint, LayoutGrid,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { InstallPwaCard } from "@/components/dashboard/InstallPwaCard";
import { TIMEZONE_OPTIONS } from "@/lib/timezones";
import { isValidTaxNumber, normalizeTaxNumber, TAX_NUMBER_MAX_LENGTH } from "@/lib/tax-number";
import { useIsMobileApp, useIsIOSNativeApp } from "@/lib/use-mobile-app";
import { isMobileAppUserAgent, hasMobileAppCookie } from "@/lib/mobile-app-shared";

function StepHeading({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 pt-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
        {n}
      </span>
      <span className="text-sm font-semibold">{children}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

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
  "estetik", "makyaj", "tattoo", "diyetisyen", "kas_kirpik", "pet_kuafor", "diger",
] as const;

type IconCmp = React.ComponentType<{ className?: string }>;

// lucide'de berber direği yok — aynı çizgi stilinde küçük özel simge.
function BarberPoleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="8" y="6" width="8" height="14" rx="1.5" />
      <path d="M8 10.5l8-3M8 15.5l8-3" />
      <path d="M9.5 3h5M10.5 3v3M13.5 3v3" />
    </svg>
  );
}

// İşletme türü kartlarının simge + renk eşlemesi (emoji yerine tutarlı, net çizgi simgeler).
const TYPE_STYLE: Record<(typeof BUSINESS_TYPE_KEYS)[number], { Icon: IconCmp; grad: string }> = {
  kuafor: { Icon: Scissors, grad: "from-rose-400 to-pink-600" },
  berber: { Icon: BarberPoleIcon, grad: "from-sky-500 to-indigo-700" },
  guzellik: { Icon: Sparkles, grad: "from-fuchsia-400 to-purple-600" },
  spa: { Icon: Flower2, grad: "from-emerald-400 to-teal-600" },
  nail: { Icon: Hand, grad: "from-pink-300 to-rose-500" },
  estetik: { Icon: Droplets, grad: "from-amber-300 to-orange-500" },
  makyaj: { Icon: Palette, grad: "from-violet-400 to-indigo-600" },
  tattoo: { Icon: PenTool, grad: "from-zinc-500 to-zinc-800" },
  diyetisyen: { Icon: Apple, grad: "from-lime-400 to-green-600" },
  kas_kirpik: { Icon: Eye, grad: "from-cyan-400 to-blue-600" },
  pet_kuafor: { Icon: PawPrint, grad: "from-orange-400 to-amber-600" },
  diger: { Icon: LayoutGrid, grad: "from-stone-400 to-stone-600" },
};

// İşletme türü kutularında gösterilen mutlu esnaf fotoğrafları (public/indir + public/sectors).
// "diger" için fotoğraf yok — eski simge görünümü kalır.
const TYPE_PHOTO: Partial<Record<(typeof BUSINESS_TYPE_KEYS)[number], string>> = {
  kuafor: "/indir/kuafor.webp",
  berber: "/indir/berber.webp",
  guzellik: "/indir/guzellik.webp",
  spa: "/indir/spa.webp",
  nail: "/indir/nail.webp",
  estetik: "/sectors/estetik.jpg",
  makyaj: "/indir/makyaj.webp",
  tattoo: "/indir/tattoo.webp",
  diyetisyen: "/indir/diyetisyen.webp",
  kas_kirpik: "/sectors/kas.jpg",
  pet_kuafor: "/indir/petkuafor.webp",
};

// Formun üstünde ters yönde kayan iki sıra mutlu esnaf kolajı (yalnızca görsel).
function RegisterCollage() {
  const imgs = Object.values(TYPE_PHOTO) as string[];
  const row = (list: string[], cls: string) => (
    <div className="overflow-hidden">
      <div className={`flex w-max gap-2 ${cls}`}>
        {[...list, ...list].map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={src} alt="" width={80} height={80} loading={i < 4 ? "eager" : "lazy"} className="h-16 w-16 shrink-0 rounded-xl object-cover shadow-md ring-1 ring-black/5 sm:h-20 sm:w-20" />
        ))}
      </div>
    </div>
  );
  return (
    <div aria-hidden="true" className="space-y-2 [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
      {row(imgs, "indir-row-l")}
      {row([...imgs].reverse(), "indir-row-r")}
    </div>
  );
}

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

// Native uygulamada (App Store/Play Store) kayıt formu yalnızca hesap + 14 günlük
// deneme açar; plan/ödeme yok. Yasal metin bağlantıları aynı sekmede açıldığı için
// (geri dönüşte form sıfırlanmasın) taslak oturum boyunca saklanır — şifre ASLA.
const NATIVE_DRAFT_KEY = "sp_register_draft";

const PURCHASE_PLAN_KEYS = ["mini", "starter", "pro", "business"] as const;
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
  const th = useTranslations("hero");
  const router = useRouter();
  const isNativeApp = useIsMobileApp();
  const isIOSNative = useIsIOSNativeApp();
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
    // Native'de ödeme niyeti yok sayılır (3.1.1) — kayıt normal "ücretsiz deneme" akışına düşer.
    if (isMobileAppUserAgent(navigator.userAgent) || hasMobileAppCookie(document.cookie)) return;
    const params = new URLSearchParams(window.location.search);
    const planParam = params.get("plan");
    if ((PURCHASE_PLAN_KEYS as readonly string[]).includes(planParam ?? "")) {
      setPurchaseIntent({ plan: planParam as PurchasePlanKey, annual: params.get("billing") === "annual" });
    }
  }, []);

  // Native taslak: geri dönüşte (yasal metin sayfasından) alanları geri yükle.
  useEffect(() => {
    if (!isNativeApp) return;
    try {
      const raw = sessionStorage.getItem(NATIVE_DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as { form?: Record<string, string>; kvkk?: boolean; gizlilik?: boolean; marketing?: boolean };
      if (d.form) setForm((f) => ({ ...f, ...d.form, password: f.password, website: "" }));
      if (d.kvkk) setKvkkChecked(true);
      if (d.gizlilik) setGizlilikChecked(true);
      if (d.marketing) setMarketingChecked(true);
    } catch {
      /* sessionStorage yoksa taslak olmadan devam */
    }
  }, [isNativeApp]);

  function saveDraft() {
    if (!isNativeApp) return;
    try {
      const { password: _pw, website: _hp, ...safe } = form;
      void _pw; void _hp;
      sessionStorage.setItem(
        NATIVE_DRAFT_KEY,
        JSON.stringify({ form: safe, kvkk: kvkkChecked, gizlilik: gizlilikChecked, marketing: marketingChecked }),
      );
    } catch {
      /* yok say */
    }
  }

  // iOS'ta marka "SiriusPlan" (bkz. useIsIOSNativeApp) — form metinlerinde de aynı ad.
  const brand = (text: string) => (isIOSNative ? text.replace(/SiriPlan/g, "SiriusPlan") : text);

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

      try { sessionStorage.removeItem(NATIVE_DRAFT_KEY); } catch { /* yok say */ }

      // Mobil tarayıcıda paneline gitmeden önce "ana ekrana ekle" kısayolunu öner
      // (zaten uygulamanın içindeysek anlamsız — doğrudan panele).
      if (isMobileDevice() && !isNativeApp) {
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
    <div className="space-y-4">
    {!isNativeApp && <RegisterCollage />}
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
        {!isNativeApp && !purchaseIntent && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />{th("trial14")}</span>
            <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />{th("noCard")}</span>
            <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />{th("cancelAnytime")}</span>
          </div>
        )}
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
          <StepHeading n={1}>{t("sectionBusiness")}</StepHeading>

          <div className="space-y-1.5">
            <Label>{t("businessTypeLabel")}</Label>
            <p className="text-xs text-muted-foreground">{t("sectionBusinessHint")}</p>
            <div role="radiogroup" aria-label={t("businessTypeLabel")} className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {BUSINESS_TYPE_KEYS.map((key) => {
                const full = t(`businessTypes.${key}`);
                const sp = full.indexOf(" ");
                const st = TYPE_STYLE[key];
                const text = sp > 0 ? full.slice(sp + 1) : full;
                const active = form.type === key;
                const photo = TYPE_PHOTO[key];
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => set("type", key)}
                    className={`group relative flex aspect-square flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border px-1.5 py-2 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      active
                        ? "border-primary shadow-md ring-2 ring-primary"
                        : "border-border bg-background hover:border-primary/60"
                    }`}
                  >
                    {photo ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo} alt="" width={160} height={160} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <span className="relative mt-auto line-clamp-2 text-[11px] font-bold leading-tight text-white drop-shadow">{text}</span>
                      </>
                    ) : (
                      <>
                        <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm transition-transform duration-200 group-hover:scale-110 ${st.grad}`}>
                          <st.Icon className="h-5 w-5" />
                        </span>
                        <span className="line-clamp-3 text-[11px] font-semibold leading-tight">{text}</span>
                      </>
                    )}
                    {active && (
                      <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
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
            <Label>{t("timezoneLabel")}</Label>
            <Select value={form.timezone} onValueChange={(v) => set("timezone", v ?? "Europe/Istanbul")}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIMEZONE_OPTIONS.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{t("timezoneHelp")}</p>
          </div>

          <StepHeading n={2}>{t("sectionYou")}</StepHeading>

          <div className="space-y-1.5">
            <Label>{t("fullNameLabel")}</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t("fullNamePlaceholder")} className="pl-9" value={form.fullName}
                onChange={(e) => set("fullName", e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
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
                <div className="relative w-20 shrink-0">
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


          <StepHeading n={3}>{t("sectionAccount")}</StepHeading>

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
                    <Link href="/kvkk" {...(isNativeApp ? { onClick: saveDraft } : { target: "_blank" })} className="text-primary font-medium hover:underline">{chunks}</Link>
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
                    <Link href="/gizlilik" {...(isNativeApp ? { onClick: saveDraft } : { target: "_blank" })} className="text-primary font-medium hover:underline">{chunks}</Link>
                  ),
                  termsLink: (chunks) => (
                    <Link href="/kosullar" {...(isNativeApp ? { onClick: saveDraft } : { target: "_blank" })} className="text-primary font-medium hover:underline">{chunks}</Link>
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
                {brand(t("marketingLabel"))}{" "}
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

          <Button type="submit" className="indir-shine relative h-12 w-full overflow-hidden text-base font-bold shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl" disabled={loading}>
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
    </div>
  );
}
