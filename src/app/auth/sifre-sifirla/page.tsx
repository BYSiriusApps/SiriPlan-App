"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Mail, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function SifreSifirlaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/yeni-sifre`,
    });

    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm">
        <CardContent className="py-10 text-center space-y-3">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
          <h2 className="text-lg font-semibold">E-posta Gönderildi</h2>
          <p className="text-muted-foreground text-sm">
            <strong>{email}</strong> adresine şifre sıfırlama bağlantısı gönderildi.
            Gelen kutunuzu (ve spam klasörünü) kontrol edin.
          </p>
          <Link href="/auth/giris" className="text-primary text-sm hover:underline block mt-4">
            Giriş sayfasına dön
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl">Şifremi Unuttum</CardTitle>
        <CardDescription>E-posta adresinize sıfırlama bağlantısı göndereceğiz</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>E-posta</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="ad@ornek.com"
                className="pl-9"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Sıfırlama Bağlantısı Gönder
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Şifrenizi hatırladınız mı?{" "}
            <Link href="/auth/giris" className="text-primary font-medium hover:underline">
              Giriş yapın
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
