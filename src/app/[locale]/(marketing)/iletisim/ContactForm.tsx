"use client";

import { useEffect, useRef, useState } from "react";
import { Send, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { HONEYPOT_FIELD } from "@/lib/bot-guard";
import { TurnstileWidget } from "@/components/marketing/TurnstileWidget";

const EMPTY = { name: "", phone: "", email: "", subject: "", message: "", website: "" };

export function ContactForm() {
  const t = useTranslations("contactPage");
  const [form, setForm] = useState(EMPTY);
  const [kvkk, setKvkk] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  /** Turnstile token'ı tek kullanımlık — her başarısız denemeden sonra tazelenir. */
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);

  /**
   * Formun ekrana geldiği an. Sunucu bunu gönderim anıyla karşılaştırır:
   * 3 saniyeden kısa sürede doldurulmuş bir form insan işi değildir
   * (bkz. lib/bot-guard.ts). useRef, yeniden render'larda damganın
   * tazelenmemesi için — state olsaydı her tuş vuruşu riskli olurdu.
   */
  const startedAt = useRef<number>(0);
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending") return;

    setStatus("sending");
    setError(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          email: form.email,
          subject: form.subject,
          message: form.message,
          kvkkConsent: kvkk,
          [HONEYPOT_FIELD]: form.website,
          form_started_at: startedAt.current,
          turnstileToken,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || t("formError"));
        setStatus("idle");
        // Harcanmış token'la tekrar denemek Cloudflare tarafında her seferinde
        // "duplicate" ile döner — kullanıcı formu düzeltse bile bir daha
        // gönderemezdi. Yeni token iste.
        setTurnstileResetKey((k) => k + 1);
        return;
      }

      setStatus("sent");
      setForm(EMPTY);
      setKvkk(false);
      setTurnstileResetKey((k) => k + 1);
    } catch {
      setError(t("formError"));
      setStatus("idle");
      setTurnstileResetKey((k) => k + 1);
    }
  }

  if (status === "sent") {
    return (
      <div className="bg-card rounded-2xl border border-border p-6 md:p-8 flex flex-col items-center justify-center text-center min-h-[420px]">
        <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-7 h-7 text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold mb-2">{t("formSuccessTitle")}</h2>
        <p className="text-sm text-muted-foreground mb-6">{t("formSuccessDesc")}</p>
        <Button variant="outline" onClick={() => setStatus("idle")}>
          {t("formSendAnother")}
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border p-6 md:p-8">
      <h2 className="text-2xl font-bold mb-2">{t("formTitle")}</h2>
      <p className="text-sm text-muted-foreground mb-6">{t("formSubtitle")}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/*
          Honeypot: ekran okuyuculardan ve klavye sırasından tamamen çıkarılmış,
          görsel olarak yok. Gerçek kullanıcı asla dolduramaz; "tüm input'ları
          doldur" mantığıyla çalışan spam botları neredeyse her zaman doldurur.
        */}
        <input
          type="text"
          name={HONEYPOT_FIELD}
          value={form.website}
          onChange={set("website")}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
        />

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">{t("fieldName")}</Label>
            <Input
              id="name"
              name="name"
              autoComplete="name"
              placeholder={t("fieldNamePlaceholder")}
              value={form.name}
              onChange={set("name")}
              maxLength={80}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">{t("fieldPhone")}</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+90 5xx xxx xx xx"
              value={form.phone}
              onChange={set("phone")}
              maxLength={30}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">{t("fieldEmail")}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder={t("fieldEmailPlaceholder")}
            value={form.email}
            onChange={set("email")}
            maxLength={160}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="subject">{t("fieldSubject")}</Label>
          <Input
            id="subject"
            name="subject"
            placeholder={t("fieldSubjectPlaceholder")}
            value={form.subject}
            onChange={set("subject")}
            maxLength={140}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="message">{t("fieldMessage")}</Label>
          <Textarea
            id="message"
            name="message"
            rows={5}
            placeholder={t("fieldMessagePlaceholder")}
            value={form.message}
            onChange={set("message")}
            maxLength={4000}
            required
          />
        </div>

        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            id="kvkk"
            name="kvkk"
            checked={kvkk}
            onChange={(e) => setKvkk(e.target.checked)}
            required
            className="mt-0.5 shrink-0"
          />
          <label htmlFor="kvkk">
            {t.rich("kvkkConsent", {
              kvkkLink: (chunks) => <a href="/kvkk" className="underline hover:text-primary">{chunks}</a>,
              gizlilikLink: (chunks) => <a href="/gizlilik" className="underline hover:text-primary">{chunks}</a>,
            })}
          </label>
        </div>

        <TurnstileWidget onToken={setTurnstileToken} resetKey={turnstileResetKey} />

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <Button
          type="submit"
          disabled={status === "sending"}
          className="w-full bg-primary hover:bg-primary/90 gap-2"
        >
          {status === "sending" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("formSending")}
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              {t("submitButton")}
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
