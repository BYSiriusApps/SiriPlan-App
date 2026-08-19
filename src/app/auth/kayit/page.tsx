"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { isValidTaxNumber, normalizeTaxNumber, TAX_NUMBER_ERROR, TAX_NUMBER_MAX_LENGTH } from "@/lib/tax-number";

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

const BUSINESS_TYPES = [
  { value: "kuafor",    label: "💇 Kuaför / Saç Salonu" },
  { value: "berber",    label: "✂️ Berber" },
  { value: "guzellik",  label: "💄 Güzellik Merkezi" },
  { value: "spa",       label: "🧖 Spa & Masaj" },
  { value: "nail",      label: "💅 Nail Salon / Tırnak" },
  { value: "estetik",   label: "✨ Estetik Klinik" },
  { value: "makyaj",    label: "🎨 Makyaj Stüdyosu" },
  { value: "tattoo",    label: "🖋️ Tattoo Stüdyosu" },
  { value: "diyetisyen",label: "🥗 Diyetisyen" },
  { value: "kas_kirpik",label: "👁️ Kaş & Kirpik Stüdyosu" },
];

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

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
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [selectedLocale, setSelectedLocale] = useState("tr");
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

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    if (field === "email") setEmailError("");
    if (field === "phone" || field === "countryCode") setPhoneError("");
    if (field === "taxNumber") setTaxError("");
  }

  function validateEmail(email: string) {
    if (!EMAIL_RE.test(email)) {
      setEmailError("Geçerli bir e-posta adresi girin (örn: ad@ornek.com)");
      return false;
    }
    setEmailError("");
    return true;
  }

  function validatePhone(phone: string, countryCode: string) {
    const digits = phone.replace(/\D/g, "");
    if (!digits) { setPhoneError("Telefon numarası zorunludur."); return false; }
    const cc = countryCode.replace(/\D/g, "") || "90";
    if (cc === "90") {
      const local = digits.replace(/^0+/, "");
      if (!/^5\d{9}$/.test(local)) {
        setPhoneError("Geçerli bir cep telefonu numarası girin (örn: 532 123 45 67)");
        return false;
      }
    } else if (digits.length < 6 || digits.length > 14) {
      setPhoneError("Geçerli bir telefon numarası girin.");
      return false;
    }
    setPhoneError("");
    return true;
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!validateEmail(form.email)) return;
    if (!validatePhone(form.phone, form.countryCode)) return;
    if (!isValidTaxNumber(form.taxNumber)) { setTaxError(TAX_NUMBER_ERROR); toast.error(TAX_NUMBER_ERROR); return; }
    if (form.password.length < 8) { toast.error("Şifre en az 8 karakter olmalı."); return; }
    if (!form.salonName.trim()) { toast.error("İşletme adı zorunludur."); return; }
    if (!kvkkChecked || !gizlilikChecked) {
      setKvkkError(true);
      toast.error("Devam etmek için zorunlu onayları işaretlemeniz gerekmektedir.");
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
        toast.error(data.error || "Kayıt başarısız. Lütfen tekrar deneyin.");
        setLoading(false);
        return;
      }

      // Now sign in with the created credentials
      const supabase = createClient();
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (signInErr) {
        toast.error("Hesap oluşturuldu ancak giriş yapılamadı: " + signInErr.message);
        router.push("/auth/giris");
        return;
      }

      toast.success("Hesabınız oluşturuldu!");

      // Mobil cihazlarda paneline gitmeden önce "ana ekrana ekle" kısayolunu öner
      if (isMobileDevice()) {
        setRegistered(true);
        setLoading(false);
        return;
      }

      window.location.href = "/dashboard";
    } catch {
      toast.error("Bir hata oluştu. Lütfen tekrar deneyin.");
      setLoading(false);
    }
  }

  if (registered) {
    return (
      <div className="space-y-4">
        <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm">
          <CardContent className="pt-6 text-center space-y-2">
            <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
            <CardTitle className="text-xl">Hesabınız oluşturuldu!</CardTitle>
            <CardDescription>
              Panele girmeden önce Siriplan&apos;ı ana ekranınıza ekleyebilirsiniz — uygulama gibi tek dokunuşla açılır.
            </CardDescription>
          </CardContent>
        </Card>

        <InstallPwaCard />

        <Button className="w-full" onClick={() => { window.location.href = "/dashboard"; }}>
          Panele Git
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
        <CardTitle className="text-2xl">14 Gün Ücretsiz Deneyin</CardTitle>
        <CardDescription>Kredi kartı gerekmez • Anında başlayın</CardDescription>
      </CardHeader>
      <CardContent>
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
            <Label>İşletme Türü</Label>
            <Select value={form.type} onValueChange={(v) => set("type", v ?? "kuafor")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BUSINESS_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Salon / İşletme Adı</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Salon Adınız" className="pl-9" value={form.salonName}
                onChange={(e) => set("salonName", e.target.value)} required minLength={2} maxLength={60} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>
              VKN / TC Kimlik No{" "}
              <span className="text-xs font-normal text-muted-foreground">(isteğe bağlı)</span>
            </Label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                inputMode="numeric"
                placeholder="Vergi No (10 hane) veya TCKN (11 hane)"
                className={`pl-9 ${taxError ? "border-red-500" : ""}`}
                value={form.taxNumber}
                onChange={(e) => set("taxNumber", normalizeTaxNumber(e.target.value))}
                onBlur={() => { if (!isValidTaxNumber(form.taxNumber)) setTaxError(TAX_NUMBER_ERROR); }}
                maxLength={TAX_NUMBER_MAX_LENGTH}
              />
            </div>
            {taxError
              ? <p className="text-xs text-red-500 mt-0.5">{taxError}</p>
              : <p className="text-xs text-muted-foreground">Faturalandırma için kullanılır, sonradan Ayarlar&apos;dan da girebilirsiniz.</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Adınız Soyadınız</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Ad Soyad" className="pl-9" value={form.fullName}
                onChange={(e) => set("fullName", e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>E-posta</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="email" inputMode="email" placeholder="ad@ornek.com"
                  className={`pl-9 ${emailError ? "border-red-500" : ""}`}
                  value={form.email} onChange={(e) => set("email", e.target.value)}
                  onBlur={() => form.email && validateEmail(form.email)}
                  required autoComplete="email" />
              </div>
              {emailError && <p className="text-xs text-red-500 mt-0.5">{emailError}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Telefon <span className="text-red-500">*</span></Label>
              <div className="flex gap-1.5">
                <div className="relative w-[4.5rem] shrink-0">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">+</span>
                  <Input inputMode="numeric" placeholder="90" title="Ülke kodu"
                    className="pl-4 pr-1 text-center"
                    value={form.countryCode}
                    onChange={(e) => set("countryCode", e.target.value.replace(/\D/g, "").slice(0, 4))}
                    maxLength={4} required />
                </div>
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="tel" inputMode="tel" placeholder="5xx xxx xx xx"
                    className={`pl-9 ${phoneError ? "border-red-500" : ""}`}
                    value={form.phone} onChange={(e) => set("phone", e.target.value)}
                    onBlur={() => form.phone && validatePhone(form.phone, form.countryCode)} required />
                </div>
              </div>
              {phoneError && <p className="text-xs text-red-500 mt-0.5">{phoneError}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Saat Dilimi</Label>
            <Select value={form.timezone} onValueChange={(v) => set("timezone", v ?? "Europe/Istanbul")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIMEZONE_OPTIONS.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Randevularınız bu saat dilimine göre hesaplanır, dilediğiniz zaman Ayarlar&apos;dan değiştirebilirsiniz.</p>
          </div>

          <div className="space-y-1.5">
            <Label>Şifre</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="password" placeholder="En az 8 karakter" className="pl-9"
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
                <Link href="/kvkk" target="_blank" className="text-primary font-medium hover:underline">KVKK Aydınlatma Metni</Link>&apos;ni
                {" "}okudum, kişisel verilerimin işlenmesini kabul ediyorum.{" "}
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
                <Link href="/gizlilik" target="_blank" className="text-primary font-medium hover:underline">Gizlilik Politikası</Link>&apos;nı
                {" "}ve{" "}
                <Link href="/kosullar" target="_blank" className="text-primary font-medium hover:underline">Kullanım Koşulları</Link>&apos;nı
                {" "}okudum ve kabul ediyorum.{" "}
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
                Siriplan&apos;ın kampanya, duyuru ve özel tekliflerinden e-posta / SMS ile haberdar olmak istiyorum.{" "}
                <span className="text-xs">(isteğe bağlı)</span>
              </label>
            </div>

            {kvkkError && (
              <p className="flex items-center gap-1 text-xs text-red-500 mt-1">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                Devam etmek için zorunlu onayları işaretleyin.
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {loading ? "Hesap oluşturuluyor..." : "Ücretsiz Hesap Oluştur"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Zaten hesabınız var mı?{" "}
            <Link href="/auth/giris" className="text-primary font-medium hover:underline">Giriş yapın</Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
