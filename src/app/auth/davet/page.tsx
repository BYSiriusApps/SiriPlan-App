"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Users } from "lucide-react";
import { toast } from "sonner";

interface InviteInfo {
  role: string;
  org_name: string;
  staff_name?: string;
  expires_at: string;
}

function DavetContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function handleAccept() {
    if (!token) return;
    setAccepting(true);

    const res = await fetch("/api/staff/invite/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    const data = await res.json();
    setAccepting(false);

    if (!res.ok) {
      if (res.status === 401) {
        // Kullanıcı giriş yapmamış → giriş sayfasına yönlendir
        router.push(`/auth/giris?redirect=/auth/davet%3Ftoken%3D${token}`);
        return;
      }
      toast.error(data.error ?? "Hata oluştu");
      return;
    }

    toast.success(`${info?.org_name} işletmesine katıldınız!`);
    router.push("/dashboard");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-0 shadow-lg">
          <CardContent className="py-10 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Davet Geçersiz</h2>
            <p className="text-muted-foreground text-sm">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const roleLabel = info?.role === "manager" ? "Yönetici" : "Personel";

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-0 shadow-lg">
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

          <p className="text-xs text-muted-foreground text-center">
            Daveti kabul ederek{" "}
            <span className="font-medium">{info?.org_name}</span>{" "}
            işletmesinin {roleLabel.toLowerCase()}ı olacaksınız.
            Giriş yapmamışsanız önce hesap oluşturmanız gerekir.
          </p>

          <Button
            className="w-full"
            onClick={handleAccept}
            disabled={accepting}
          >
            {accepting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Daveti Kabul Et
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DavetPage() {
  return (
    <Suspense>
      <DavetContent />
    </Suspense>
  );
}
