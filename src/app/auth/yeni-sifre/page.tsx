"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Lock, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type Phase = "verifying" | "ready" | "invalid" | "done";

export default function YeniSifrePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("verifying");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  // Sıfırlama e-postasındaki linke tıklandığında bu sayfa ÜÇ farklı şekilde
  // açılabilir — Supabase'in e-posta şablonu ayarına göre değişir:
  //   1) ?token_hash=...&type=recovery   → verifyOtp ile doğrulanır (önerilen;
  //      cihazlar arası çalışır, PKCE çerezine bağımlı değildir)
  //   2) ?code=...                       → exchangeCodeForSession (PKCE akışı,
  //      linke isteği başlatan tarayıcıda tıklanmışsa çalışır)
  //   3) #access_token=...&type=recovery → tarayıcı istemcisi otomatik yakalar
  // Hangi biçim gelirse gelsin oturumu kurup şifre formunu gösteririz; token
  // süresi dolmuş/geçersizse "yeni link iste" ekranına düşeriz.
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function establishSession() {
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(url.hash.replace(/^#/, ""));

      // E-posta linki süresi dolmuş / iptal edilmişse Supabase hata bilgisini
      // hash'te döndürür.
      if (hash.get("error") || url.searchParams.get("error")) {
        if (!cancelled) setPhase("invalid");
        return;
      }

      const tokenHash = url.searchParams.get("token_hash");
      const type = url.searchParams.get("type");
      const code = url.searchParams.get("code");

      try {
        if (tokenHash && type) {
          await supabase.auth.verifyOtp({ type: type as "recovery", token_hash: tokenHash });
        } else if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        }
      } catch {
        // Yut: istemci `detectSessionInUrl` ile token'ı zaten işlemiş olabilir;
        // bu durumda ikinci deneme hata verir ama oturum yine de kurulmuştur.
        // Nihai karar aşağıdaki getSession kontrolünde.
      }

      // #access_token akışında ve yukarıdaki "zaten işlendi" durumunda oturum
      // istemci tarafında (detectSessionInUrl) asenkron kurulur — birkaç kez
      // yoklayıp öyle karar veririz, aksi halde yarış koşulunda geçerli bir
      // linki "geçersiz" sanabiliriz.
      for (let i = 0; i < 6 && !cancelled; i++) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          window.history.replaceState(null, "", "/auth/yeni-sifre");
          setPhase("ready");
          return;
        }
        await new Promise((r) => setTimeout(r, 250));
      }
      if (!cancelled) setPhase("invalid");
    }

    establishSession();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Şifre en az 8 karakter olmalı.");
      return;
    }
    if (password !== confirm) {
      toast.error("Şifreler eşleşmiyor.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error("Şifre güncellenemedi: " + error.message);
    } else {
      setPhase("done");
      setTimeout(() => router.push("/dashboard"), 2000);
    }
    setLoading(false);
  }

  if (phase === "verifying") {
    return (
      <Card className="w-full max-w-md shadow-xl border-0 bg-card/80 backdrop-blur-sm">
        <CardContent className="py-12 text-center space-y-3">
          <Loader2 className="h-10 w-10 text-primary mx-auto animate-spin" />
          <p className="text-muted-foreground text-sm">Bağlantı doğrulanıyor...</p>
        </CardContent>
      </Card>
    );
  }

  if (phase === "invalid") {
    return (
      <Card className="w-full max-w-md shadow-xl border-0 bg-card/80 backdrop-blur-sm">
        <CardContent className="py-10 text-center space-y-3">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
          <h2 className="text-lg font-semibold">Bağlantı geçersiz veya süresi dolmuş</h2>
          <p className="text-muted-foreground text-sm">
            Şifre sıfırlama bağlantıları kısa süre geçerlidir ve yalnızca bir kez kullanılabilir.
            Yeni bir bağlantı isteyin.
          </p>
          <Link
            href="/auth/sifre-sifirla"
            className="text-primary text-sm font-medium hover:underline block mt-4"
          >
            Yeni sıfırlama bağlantısı iste
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (phase === "done") {
    return (
      <Card className="w-full max-w-md shadow-xl border-0 bg-card/80 backdrop-blur-sm">
        <CardContent className="py-10 text-center space-y-3">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
          <h2 className="text-lg font-semibold">Şifre Güncellendi</h2>
          <p className="text-muted-foreground text-sm">Panele yönlendiriliyorsunuz...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-xl border-0 bg-card/80 backdrop-blur-sm">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl">Yeni Şifre Belirle</CardTitle>
        <CardDescription>En az 8 karakter, güçlü bir şifre seçin</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Yeni Şifre</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="En az 8 karakter"
                className="pl-9"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
                autoComplete="new-password"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Şifre Tekrar</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Şifreyi tekrar girin"
                className="pl-9"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={8}
                required
                autoComplete="new-password"
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Şifreyi Güncelle
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
