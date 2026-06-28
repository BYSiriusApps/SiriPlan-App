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
  { value: "kuafor", label: "💇 Kuaför / Saç Salonu" },
  { value: "berber", label: "✂️ Berber" },
  { value: "guzellik", label: "💄 Güzellik Merkezi" },
  { value: "spa", label: "🧖 Spa & Masaj" },
  { value: "nail", label: "💅 Nail Salon / Tırnak" },
  { value: "estetik", label: "✨ Estetik Klinik" },
  { value: "makyaj", label: "🎨 Makyaj Stüdyosu" },
  { value: "tattoo", label: "🖋️ Tattoo Stüdyosu" },
  { value: "diyetisyen", label: "🥗 Diyetisyen" },
  { value: "kas_kirpik", label: "👁️ Kaş & Kirpik Stüdyosu" },
];

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[çÇ]/g, "c")
    .replace(/[ğĞ]/g, "g")
    .replace(/[ıİ]/g, "i")
    .replace(/[öÖ]/g, "o")
    .replace(/[şŞ]/g, "s")
    .replace(/[üÜ]/g, "u")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 35);
}

export default function KayitPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    salonName: "",
    type: "kuafor",
    fullName: "",
    email: "",
    phone: "",
    password: "",
  });
  const [emailError, setEmailError] = useState("");

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    if (field === "email") setEmailError("");
  }

  function validateEmail(email: string) {
    if (!EMAIL_RE.test(email)) {
      setEmailError("Geçerli bir e-posta adresi girin (örn: ad@ornek.com)");
      return false;
    }
    setEmailError("");
    return true;
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();

    if (!validateEmail(form.email)) return;
    if (form.password.length < 8) {
      toast.error("Şifre en az 8 karakter olmalı.");
      return;
    }
    if (!form.salonName.trim()) {
      toast.error("İşletme adı zorunludur.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError || !authData.user) {
      toast.error(authError?.message || "Kayıt başarısız.");
      setLoading(false);
      return;
    }

    // 2. Create organization + org_member via server API (bypasses RLS)
    const slug = slugify(form.salonName) + "-" + Math.random().toString(36).slice(2, 6);
    const res = await fetch("/api/auth/complete-registration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: authData.user.id,
        salonName: form.salonName.trim(),
        type: form.type,
        phone: form.phone,
        email: form.email,
        fullName: form.fullName.trim(),
        slug,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      toast.error("İşletme oluşturulamadı: " + (err.error || "Bilinmeyen hata"));
      setLoading(false);
      return;
    }

    toast.success("Hesabınız oluşturuldu! E-postanızı doğrulayın 📬");
    router.push("/auth/plan-sec");
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
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
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
              <Input
                placeholder="Salon Adınız"
                className="pl-9"
                value={form.salonName}
                onChange={(e) => set("salonName", e.target.value)}
                required
                minLength={2}
                maxLength={60}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Adınız Soyadınız</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ad Soyad"
                className="pl-9"
                value={form.fullName}
                onChange={(e) => set("fullName", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>E-posta</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  inputMode="email"
                  placeholder="ad@ornek.com"
                  className={`pl-9 ${emailError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  onBlur={() => form.email && validateEmail(form.email)}
                  required
                  autoComplete="email"
                />
              </div>
              {emailError && (
                <p className="text-xs text-red-500 mt-0.5">{emailError}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Telefon</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="tel"
                  placeholder="05xx xxx xxxx"
                  className="pl-9"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Şifre</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="En az 8 karakter"
                className="pl-9"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                minLength={8}
                required
                autoComplete="new-password"
              />
            </div>
          </div>

          <Button type="submit" className="w-full mt-2" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {loading ? "Hesap oluşturuluyor..." : "Ücretsiz Hesap Oluştur"}
          </Button>

          <p className="text-center text-xs text-muted-foreground pt-2">
            Kayıt olarak{" "}
            <Link href="/gizlilik" className="text-primary hover:underline">Gizlilik Politikası</Link>'nı ve{" "}
            <Link href="/kullanim-kosullari" className="text-primary hover:underline">Kullanım Koşulları</Link>'nı kabul etmiş olursunuz.
          </p>

          <p className="text-center text-sm text-muted-foreground">
            Zaten hesabınız var mı?{" "}
            <Link href="/auth/giris" className="text-primary font-medium hover:underline">
              Giriş yapın
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
