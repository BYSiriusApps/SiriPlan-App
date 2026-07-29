"use client";

import { useState, useEffect, use } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, ShieldCheck } from "lucide-react";

type ConsentInfo = {
  org_name: string;
  notice_text: string;
  completed: boolean;
};

export default function ConsentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<ConsentInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    fetch(`/api/public/consent?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Bağlantı bulunamadı.");
        setInfo(d);
        if (d.completed) setDone(true);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAccept() {
    setSubmitting(true);
    try {
      const r = await fetch("/api/public/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, kvkk: true, marketing }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Onay kaydedilemedi.");
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 space-y-5">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
            </div>
          ) : error ? (
            <div className="text-center py-8 space-y-3">
              <XCircle className="h-12 w-12 text-red-500 mx-auto" />
              <p className="font-semibold text-lg">Bir sorun oluştu</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          ) : done ? (
            <div className="text-center py-8 space-y-3">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <p className="font-semibold text-lg">Onayınız Alındı</p>
              <p className="text-sm text-muted-foreground">
                {info?.org_name} artık size randevu bildirimleri gönderebilir.
              </p>
            </div>
          ) : info ? (
            <>
              <div className="text-center space-y-1">
                <ShieldCheck className="h-8 w-8 text-primary mx-auto" />
                <h1 className="text-xl font-bold">KVKK Aydınlatma Metni</h1>
                <p className="text-sm text-muted-foreground">{info.org_name}</p>
              </div>

              <div className="rounded-xl bg-muted/50 p-4 text-xs text-muted-foreground max-h-64 overflow-y-auto">
                {info.notice_text}
              </div>

              <label className="flex items-start gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={marketing}
                  onChange={(e) => setMarketing(e.target.checked)}
                />
                <span>Kampanya ve fırsatlardan haberdar olmak istiyorum (opsiyonel)</span>
              </label>

              <Button className="w-full" onClick={handleAccept} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Okudum, Onaylıyorum
              </Button>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
