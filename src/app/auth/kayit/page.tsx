"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Building2, Mail, Lock, Phone, User } from "lucide-react";
import { toast } from "sonner";

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
const PHONE_RE = /^(\+90|0090|90)?[- ]?5\d{2}[- ]?\d{3}[- ]?\d{2}[- ]?\d{2}$/;

function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length === 12) return "0" + digits.slice(2);
  if (digits.length === 10 && digits.startsWith("5")) return "0" + digits;
  return digits.length === 11 ? digits : raw;
}

export default function KayitPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    salonName: "", type: "kuafor", fullName: "",
    email: "", phone: "", password: "",
  });
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    if (field === "email") setEmailError("");
    if (field === "phone") setPhoneError("");
  }

  function validateEmail(email: string) {
    if (!EMAIL_RE.test(email)) {
      setEmailError("Geçerli bir e-posta adresi girin (örn: ad@ornek.com)");
      return false;
    }
    setEmailError("");
    return true;
  }

  function validatePhone(phone: string) {
    if (!phone.trim()) { setPhoneError("Telefon numarası zorunludur."); return false; }
    if (!PHONE_RE.test(phone.trim())) {
      setPhoneError("Geçerli bir Türkiye numarası girin (örn: 0532 123 45 67)");
      return false;
    }
    setPhoneError("");
    return true;
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!validateEmail(form.email)) return;
    if (!validatePhone(form.phone)) return;
    if (form.password.length < 8) { toast.error("Şifre en az 8 karakter olmalı."); return; }
    if (!form.salonName.trim()) { toast.error("İşletme adı zorunludur."); return; }

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
          phone: normalizePhone(form.phone),
          businessType: form.type,
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

      toast.success("Hesabınız oluşturuldu! Dashboard'a yönlendiriliyorsunuz...");
      window.location.href = "/dashboard";
    } catch {
      toast.error("Bir hata oluştu. Lütfen tekrar deneyin.");
      setLoading(false);
    }
  }

  return (
    <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl">14 Gün Ücretsiz Deneyin</CardTitle>
        <CardDescription>Kredi kartı gerekmez • Anında başlayın</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleRegister} className="space-y-3">
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
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="tel" inputMode="tel" placeholder="05xx xxx xxxx"
                  className={`pl-9 ${phoneError ? "border-red-500" : ""}`}
                  value={form.phone} onChange={(e) => set("phone", e.target.value)}
                  onBlur={() => form.phone && validatePhone(form.phone)} required />
              </div>
              {phoneError && <p className="text-xs text-red-500 mt-0.5">{phoneError}</p>}
            </div>
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

          <Button type="submit" className="w-full mt-2" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {loading ? "Hesap oluşturuluyor..." : "Ücretsiz Hesap Oluştur"}
          </Button>

          <p className="text-center text-xs text-muted-foreground pt-2">
            Kayıt olarak{" "}
            <Link href="/gizlilik" className="text-primary hover:underline">Gizlilik Politikası</Link>&apos;nı ve{" "}
            <Link href="/kosullar" className="text-primary hover:underline">Kullanım Koşulları</Link>&apos;nı kabul etmiş olursunuz.
          </p>

          <p className="text-center text-sm text-muted-foreground">
            Zaten hesabınız var mı?{" "}
            <Link href="/auth/giris" className="text-primary font-medium hover:underline">Giriş yapın</Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
