"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2, Zap, Building2, Sparkles, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const PLANS = [
  {
    key: "starter",
    name: "Starter",
    icon: Zap,
    monthly: 39,
    annual: 32,
    color: "border-blue-200 dark:border-blue-800",
    highlight: "",
    description: "Küçük işletmeler için ideal başlangıç",
    features: [
      "3 personel",
      "300 randevu/ay",
      "Online randevu sayfası",
      "WhatsApp hatırlatma",
      "Müşteri yönetimi",
      "Temel raporlar",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    icon: Sparkles,
    monthly: 69,
    annual: 57,
    color: "border-primary ring-2 ring-primary",
    highlight: "Çok Satan",
    description: "Büyüyen işletmeler için eksiksiz araç seti",
    features: [
      "Sınırsız personel",
      "Sınırsız randevu",
      "Tüm Starter özellikleri",
      "AI asistanı (WA/IG auto-reply)",
      "Kampanya modülü",
      "Müşteri skorlama",
      "Gamification (Haftanın Elemanı)",
      "Google Calendar sync",
      "Veri göçü (mevcut sistemden)",
    ],
  },
  {
    key: "business",
    name: "Business",
    icon: Building2,
    monthly: 119,
    annual: 99,
    color: "border-purple-200 dark:border-purple-800",
    highlight: "",
    description: "Zincir ve büyük ölçekli işletmeler için",
    features: [
      "Tüm Pro özellikleri",
      "Sınırsız şube",
      "Beyaz etiket (White-label)",
      "API erişimi",
      "Öncelikli destek",
      "Özel entegrasyonlar",
    ],
  },
];

export default function PlanSecPage() {
  const [annual, setAnnual] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [trialLoading, setTrialLoading] = useState(false);
  // null = bilinmiyor (henüz yüklenmedi), true = deneme aktif, false = süresi dolmuş
  const [trialActive, setTrialActive] = useState<boolean | null>(null);
  const [expired, setExpired] = useState(false);

  // ?expired=1 — dashboard süresi dolduğu için yönlendirdiyse banner göster
  // (useSearchParams statik prerender'da Suspense istediği için window'dan okunur)
  useEffect(() => {
    setExpired(new URLSearchParams(window.location.search).get("expired") === "1");
  }, []);

  // Aktif işletmenin deneme durumunu öğren — "devam et" davranışını belirler
  useEffect(() => {
    fetch("/api/org")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.org) return;
        const paid = d.org.plan !== "trial" && d.org.subscription_status === "active";
        const trialOk =
          d.org.plan === "trial" &&
          d.org.trial_ends_at &&
          new Date(d.org.trial_ends_at) > new Date();
        setTrialActive(paid || trialOk);
      })
      .catch(() => {});
  }, []);

  async function handleSelect(planKey: string) {
    setLoading(planKey);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey, annual }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error("Bir hata oluştu.");
      }
    } catch {
      toast.error("Bağlantı hatası.");
    }
    setLoading(null);
  }

  async function handleTrial() {
    setTrialLoading(true);
    try {
      // Panele dönmeden önce deneme/abonelik durumunu doğrula —
      // süresi dolmuşsa dashboard bizi buraya geri atar (sessiz döngü olurdu).
      const res = await fetch("/api/org");
      if (res.ok) {
        const d = await res.json();
        const paid = d.org?.plan !== "trial" && d.org?.subscription_status === "active";
        const trialOk =
          d.org?.plan === "trial" &&
          d.org?.trial_ends_at &&
          new Date(d.org.trial_ends_at) > new Date();
        if (!paid && !trialOk) {
          toast.error("Ücretsiz deneme süreniz doldu. Devam etmek için bir plan seçmeniz gerekiyor.");
          setTrialLoading(false);
          return;
        }
      }
    } catch {
      // API'ye ulaşılamazsa yine de dene — dashboard kendi kontrolünü yapar
    }
    window.location.href = "/dashboard";
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-background to-fuchsia-50 dark:from-zinc-950 dark:via-background dark:to-purple-950/30 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          {(expired || trialActive === false) && (
            <div className="max-w-lg mx-auto mb-6 flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 px-4 py-3 text-left">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-300">
                <strong>7 günlük ücretsiz deneme süreniz doldu.</strong> Panele erişmeye devam
                etmek için aşağıdan bir plan seçin — verileriniz güvende, hiçbir şey silinmedi.
              </p>
            </div>
          )}
          <h1 className="text-3xl font-bold mb-2">Planınızı Seçin</h1>
          <p className="text-muted-foreground">7 gün ücretsiz deneme • İstediğiniz zaman iptal</p>

          <div className="flex items-center justify-center gap-3 mt-6">
            <span className={annual ? "text-muted-foreground" : "font-semibold"}>Aylık</span>
            <button
              onClick={() => setAnnual(!annual)}
              className={`relative w-14 h-7 rounded-full transition-colors ${annual ? "bg-primary" : "bg-muted"}`}
            >
              <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${annual ? "translate-x-7" : ""}`} />
            </button>
            <span className={annual ? "font-semibold" : "text-muted-foreground"}>
              Yıllık <Badge variant="secondary" className="ml-1 text-xs">%18 tasarruf</Badge>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const price = annual ? plan.annual : plan.monthly;
            return (
              <Card key={plan.key} className={`relative ${plan.color} transition-all hover:shadow-xl`}>
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-3 shadow">{plan.highlight}</Badge>
                  </div>
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-5 w-5 text-primary" />
                    <CardTitle>{plan.name}</CardTitle>
                  </div>
                  <CardDescription className="text-xs">{plan.description}</CardDescription>
                  <div className="mt-3">
                    <span className="text-4xl font-bold">${price}</span>
                    <span className="text-muted-foreground text-sm">/ay</span>
                    {annual && (
                      <p className="text-xs text-muted-foreground mt-1">
                        ${plan.monthly * 12 - plan.annual * 12} yıllık tasarruf
                      </p>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={plan.highlight ? "default" : "outline"}
                    onClick={() => handleSelect(plan.key)}
                    disabled={loading === plan.key}
                  >
                    {loading === plan.key ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {plan.highlight ? "Hemen Başla" : "Seç"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {trialActive !== false && (
          <div className="text-center">
            <button
              onClick={handleTrial}
              disabled={trialLoading}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors disabled:opacity-50"
            >
              {trialLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Şimdilik ücretsiz denemeye devam et →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
