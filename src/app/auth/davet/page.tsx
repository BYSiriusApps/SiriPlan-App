"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, CheckCircle2, XCircle, Users, Mail, Lock, User } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface InviteInfo {
  role: string;
  org_name: string;
  staff_name?: string;
  email?: string | null;
  expires_at: string;
}

function DavetContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Davet linkine tıklayan kişinin zaten oturumu olup olmadığı — buna göre
  // ya doğrudan "kabul et" ya da hesap oluştur/giriş yap seçenekleri gösterilir.
  const [authChecked, setAuthChecked] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  const [mode, setMode] = useState<"register" | "login">("register");
  const [submitting, setSubmitting] = useState(false);

  const [fullName, setFullName] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  useEffect(() => {
    if (!token) { setError("Geçersiz davet bağlantısı"); setLoading(false); return; }

    fetch(`/api/staff/invite/accept?token=${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setInfo(d);
      })
      .catch(() => setError("Bağlantı hatası"))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setLoggedIn(!!data.user);
      setAuthChecked(true);
    });
  }, []);

  async function acceptForLoggedInUser() {
    if (!token) return;
    setSubmitting(true);
    const res = await fetch("/api/staff/invite/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    if (!res.ok) {
      setSubmitting(false);
      toast.error(data.error ?? "Hata oluştu");
      return;
    }
    toast.success(`${info?.org_name} işletmesine katıldınız!`);
    // Sunucuda oturum/üyelik değişti — panelin ilk isteğinde en güncel çerezle
    // gitmesi için sert yönlendirme (bkz. /auth/giris'teki aynı desen).
    window.location.href = "/dashboard";
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (fullName.trim().length < 2) { toast.error("Ad soyad girin"); return; }
    if (regPassword.length < 8) { toast.error("Şifre en az 8 karakter olmalı"); return; }

    setSubmitting(true);
    const res = await fetch("/api/staff/invite/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, full_name: fullName.trim(), password: regPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      setSubmitting(false);
      toast.error(data.error ?? "Hesap oluşturulamadı");
      return;
    }
    toast.success(`${info?.org_name} işletmesine katıldınız!`);
    window.location.href = data.requiresLogin ? "/auth/giris" : "/dashboard";
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: identifier.trim(), password: loginPassword, rememberMe: true }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error("Giriş başarısız: " + (err.error || res.statusText));
      setSubmitting(false);
      return;
    }
    await acceptForLoggedInUser();
  }

  if (loading || !authChecked) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="py-10 text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Davet Geçersiz</h2>
          <p className="text-muted-foreground text-sm">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const roleLabel = info?.role === "manager" ? "Yönetici" : "Personel";

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center pb-2">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <Users className="h-7 w-7 text-primary" />
        </div>
        <CardTitle className="text-xl">İşletmeye Davet</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-2">
        <div className="rounded-xl bg-muted/50 p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">İşletme</span>
            <span className="font-semibold">{info?.org_name}</span>
          </div>
          {info?.staff_name && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Personel Kaydı</span>
              <span className="font-semibold">{info.staff_name}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Rol</span>
            <span className="font-semibold">{roleLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Süre Bitiş</span>
            <span className="text-xs">{new Date(info?.expires_at ?? "").toLocaleDateString("tr-TR")}</span>
          </div>
        </div>

        {loggedIn ? (
          <>
            <p className="text-xs text-muted-foreground text-center">
              Daveti kabul ederek{" "}
              <span className="font-medium">{info?.org_name}</span>{" "}
              işletmesinin {roleLabel.toLowerCase()}ı olacaksınız.
            </p>
            <Button className="w-full" onClick={acceptForLoggedInUser} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Daveti Kabul Et
            </Button>
          </>
        ) : (
          <Tabs value={mode} onValueChange={(v) => setMode(v === "login" ? "login" : "register")}>
            <TabsList className="w-full">
              <TabsTrigger value="register" className="flex-1">Yeni Hesap Oluştur</TabsTrigger>
              <TabsTrigger value="login" className="flex-1">Zaten Hesabım Var</TabsTrigger>
            </TabsList>

            <TabsContent value="register" className="pt-4">
              <form onSubmit={handleRegister} className="space-y-3">
                {info?.email && (
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1"><Mail className="h-3 w-3" />E-posta</Label>
                    <Input value={info.email} readOnly disabled className="text-sm bg-muted/50" />
                  </div>
                )}
                <div className="space-y-1">
                  <Label htmlFor="full_name" className="text-xs flex items-center gap-1"><User className="h-3 w-3" />Ad Soyad</Label>
                  <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="reg_password" className="text-xs flex items-center gap-1"><Lock className="h-3 w-3" />Şifre</Label>
                  <Input
                    id="reg_password"
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="text-sm"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Hesap Oluştur & Katıl
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="login" className="pt-4">
              <form onSubmit={handleLogin} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="identifier" className="text-xs">E-posta veya Telefon</Label>
                  <Input id="identifier" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="login_password" className="text-xs">Şifre</Label>
                  <Input
                    id="login_password"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="text-sm"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Giriş Yap & Katıl
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

export default function DavetPage() {
  return (
    <Suspense>
      <DavetContent />
    </Suspense>
  );
}
