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
import { tm } from "@/lib/toast-i18n";
import { useTranslations } from "next-intl";

type Phase = "verifying" | "ready" | "invalid" | "done";

export default function YeniSifrePage() {
  const tp = useTranslations("panelPages.yeniSifre");
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
      toast.error(tm("pwMin8"));
      return;
    }
    if (password !== confirm) {
      toast.error(tm("pwMismatch"));
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error(tm("pwUpdateFailed", { msg: error.message }));
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
          <p className="text-muted-foreground text-sm">{tp("baglanti_dogrulaniyor")}</p>
        </CardContent>
      </Card>
    );
  }

  if (phase === "invalid") {
    return (
      <Card className="w-full max-w-md shadow-xl border-0 bg-card/80 backdrop-blur-sm">
        <CardContent className="py-10 text-center space-y-3">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
          <h2 className="text-lg font-semibold">{tp("baglanti_gecersiz_veya_sures")}</h2>
          <p className="text-muted-foreground text-sm">
            {tp("sifre_sifirlama_baglantilari")}
          </p>
          <Link
            href="/auth/sifre-sifirla"
            className="text-primary text-sm font-medium hover:underline block mt-4"
          >
            {tp("yeni_sifirlama_baglantisi_is")}
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
          <h2 className="text-lg font-semibold">{tp("sifre_guncellendi")}</h2>
          <p className="text-muted-foreground text-sm">{tp("panele_yonlendiriliyorsunuz")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-xl border-0 bg-card/80 backdrop-blur-sm">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl">{tp("yeni_sifre_belirle")}</CardTitle>
        <CardDescription>{tp("en_az_8_karakter")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>{tp("yeni_sifre")}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder={tp("en_az_8_karakter_2")}
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
            <Label>{tp("sifre_tekrar")}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder={tp("sifreyi_tekrar_girin")}
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
            {tp("sifreyi_guncelle")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
