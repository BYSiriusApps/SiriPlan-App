"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Mail, Lock, Zap } from "lucide-react";
import { toast } from "sonner";

export default function GirisPage() {
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function doLogin(identifier: string, p: string) {
    // E-posta veya telefon kabul eden sunucu taraflı giriş.
    // Cookie'ler sunucuda set edilir; hard redirect ile ilk istekte gönderilir.
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), password: p }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error("Giriş başarısız: " + (err.error || res.statusText));
        return false;
      }
      window.location.href = "/dashboard";
      return true;
    } catch {
      toast.error("Bağlantı hatası — tekrar deneyin");
      return false;
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await doLogin(email, password);
    setLoading(false);
  }

  async function handleDemoLogin() {
    setDemoLoading(true);
    const ok = await doLogin("demo@siriplan.com", "Demo1234!");
    if (!ok) setDemoLoading(false);
  }

  return (
    <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl">Hoş Geldiniz</CardTitle>
        <CardDescription>Hesabınıza giriş yapın</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Demo quick-login */}
        <Button
          type="button"
          className="w-full gap-2 font-semibold"
          style={{
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            border: "none",
            color: "white",
          }}
          onClick={handleDemoLogin}
          disabled={demoLoading || loading}
        >
          {demoLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          Demo Dashboard'ı Gör
        </Button>

        {/* Separator */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">veya hesabınızla giriş yapın</span>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-posta veya Telefon</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="text"
                autoComplete="username"
                placeholder="salon@example.com veya 05xx xxx xx xx"
                className="pl-9"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Personelseniz sisteme kayıtlı telefon numaranızla da giriş yapabilirsiniz.
            </p>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="password">Şifre</Label>
              <Link href="/auth/sifre-sifirla" className="text-xs text-primary hover:underline">
                Şifremi unuttum
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="pl-9"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading || demoLoading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Giriş Yap
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Hesabınız yok mu?{" "}
          <Link href="/auth/kayit" className="text-primary font-medium hover:underline">
            Ücretsiz deneyin
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
