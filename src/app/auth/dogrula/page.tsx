"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function DogrulaPage() {
  const [resending, setResending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleResend() {
    setResending(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.email) {
      toast.error("Oturum bulunamadı. Lütfen tekrar kayıt olun.");
      setResending(false);
      return;
    }

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: user.email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/auth/plan-sec` },
    });

    if (error) {
      toast.error("Gönderilemedi: " + error.message);
    } else {
      setSent(true);
      toast.success("Doğrulama e-postası tekrar gönderildi!");
    }
    setResending(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">E-postanızı Doğrulayın</CardTitle>
          <CardDescription className="text-base mt-2">
            Kayıt olduğunuz e-posta adresine bir doğrulama linki gönderdik.
            Lütfen gelen kutunuzu kontrol edin ve linke tıklayın.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground space-y-2">
            <p>• Spam/junk klasörünü de kontrol edin</p>
            <p>• Link 24 saat geçerlidir</p>
            <p>• Doğrulama yapılmadan sisteme giriş yapılamaz</p>
          </div>

          {sent ? (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-950/30 rounded-lg p-3 text-sm">
              <CheckCircle className="h-4 w-4 shrink-0" />
              Doğrulama e-postası tekrar gönderildi.
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleResend}
              disabled={resending}
            >
              {resending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              E-postayı Tekrar Gönder
            </Button>
          )}

          <p className="text-center text-sm text-muted-foreground">
            Farklı bir hesapla giriş yapmak mı istiyorsunuz?{" "}
            <Link href="/auth/giris" className="text-primary hover:underline font-medium">
              Giriş sayfası
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
