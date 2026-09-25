"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Loader2, AlertTriangle, Mic, Check } from "lucide-react";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";
import { useMicAccess } from "@/components/dashboard/useMicAccess";
import { useVoiceConfirmCommand } from "@/components/dashboard/useVoiceConfirmCommand";
import { usePlan } from "@/components/dashboard/PlanContext";
import { parseVoiceCustomer } from "@/lib/voice-customer-parse";

/** Sesli özet kutusundaki bir satır — boşsa ve eksik işaretliyse amber gösterir. */
function VoiceRow({
  label, value, missing, emptyLabel,
}: { label: string; value?: string; missing?: boolean; emptyLabel: string }) {
  return (
    <p>
      <strong className="text-foreground">{label}:</strong>{" "}
      {value ? value : <span className={missing ? "text-amber-600 dark:text-amber-400 font-medium" : ""}>{emptyLabel}</span>}
    </p>
  );
}

export default function MusteriYeniPage() {
  const t = useTranslations("dashboard");
  const tm = useTranslations("dashboard.mic");
  const { requestMic, micDialog, speechLang } = useMicAccess();
  const { proTools } = usePlan();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    birth_date: "",
    gender: "",
    notes: "",
    preferred_language: "",
  });
  const [dupMatch, setDupMatch] = useState<{ id: string; full_name: string } | null>(null);
  const phoneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Sesli doldurma (Pro+) — randevu oluşturmadaki aynı desen: dinle →
  // özetle → onayla/düzelt/eksikleri tamamla. Ayrıştırma tamamen yerelde
  // (parseVoiceCustomer) yapılır, Gemini'ye gitmez.
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [voiceSummary, setVoiceSummary] = useState<{ full_name: string; phone: string } | null>(null);
  const [voiceMissing, setVoiceMissing] = useState<string[]>([]);
  const [isConfirmingVoice, setIsConfirmingVoice] = useState(false);
  const recognitionRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const formRef = useRef(form);
  useEffect(() => { formRef.current = form; }, [form]);

  // Aynı telefonla mükerrer müşteri kaydı açmayı önlemek için — yazarken var olan
  // eşleşmeyi proaktif gösterir; kesin engel zaten POST /api/customers'ta (409).
  function checkDuplicatePhone(phone: string) {
    if (phoneTimerRef.current) clearTimeout(phoneTimerRef.current);
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 9) { setDupMatch(null); return; }
    phoneTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/customers?q=${encodeURIComponent(phone)}&limit=5`);
        const json = await res.json();
        const hit = ((json.customers ?? []) as { id: string; full_name: string; phone: string }[]).find(
          (c) => c.phone.replace(/\D/g, "").endsWith(digits.slice(-9))
        );
        setDupMatch(hit ? { id: hit.id, full_name: hit.full_name } : null);
      } catch {
        setDupMatch(null);
      }
    }, 350);
  }

  async function submitCustomer() {
    if (!form.full_name.trim()) { toast.error("İsim zorunlu"); return false; }
    if (!form.phone.trim()) { toast.error("Telefon zorunlu"); return false; }

    setLoading(true);
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        birth_date: form.birth_date || null,
        gender: form.gender || null,
        notes: form.notes.trim() || null,
        preferred_language: form.preferred_language || null,
      }),
    });
    setLoading(false);

    if (res.ok) {
      toast.success("Müşteri eklendi");
      router.push("/dashboard/musteriler");
      router.refresh();
      return true;
    }
    const data = await res.json();
    toast.error(data.error || "Hata oluştu");
    return false;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submitCustomer();
  }

  const voiceLabelFor = useCallback((m: string) => (
    m === "full_name" ? tm("fieldCustomer") : m === "phone" ? tm("lblPhone") : m
  ), [tm]);

  /** Ayrıştırılan bilgiyi forma AKTARIR — dolu alanları ezmeden yalnızca boşları doldurur. */
  const applyVoiceParsed = useCallback((parsed: { full_name: string; phone: string }) => {
    const cur = formRef.current;
    setForm((f) => ({
      ...f,
      full_name: f.full_name || parsed.full_name || "",
      phone: f.phone || parsed.phone || "",
    }));

    const mName = cur.full_name || parsed.full_name || "";
    const mPhone = cur.phone || parsed.phone || "";
    if (mPhone && mPhone !== cur.phone) checkDuplicatePhone(mPhone);

    const missing: string[] = [];
    if (!mName) missing.push("full_name");
    if (!mPhone) missing.push("phone");

    setVoiceMissing(missing);
    setVoiceSummary({ full_name: mName, phone: mPhone });
    setIsConfirmingVoice(true);

    if (missing.length) {
      toast(tm("filledPartial", { fields: missing.map(voiceLabelFor).join(", ") }), { icon: "📝", duration: 7000 });
    } else {
      toast.success(tm("filledComplete"));
    }
  }, [tm, voiceLabelFor]);

  const startVoiceCustomer = useCallback(async () => {
    if (!proTools) { toast.error(tm("proOnly")); return; }
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { toast.error(tm("unsupported")); return; }

    const hasPermission = await requestMic();
    if (!hasPermission) return;

    if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch {} }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = speechLang;
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    const LISTEN_MS = 10000;
    const startedAt = Date.now();
    const timer: { id?: ReturnType<typeof setTimeout> } = {};
    let accum = "";
    let finishing = false;
    let discarded = false;
    let restarts = 0;

    const finish = () => {
      if (finishing || discarded) return;
      finishing = true;
      if (timer.id) clearTimeout(timer.id);
      try { recognition.stop(); } catch {}
    };
    timer.id = setTimeout(finish, LISTEN_MS);

    setLiveTranscript("");

    recognition.onstart = () => {
      setIsListening(true);
      setIsConfirmingVoice(false);
      try { navigator.vibrate?.(60); } catch {}
      toast(tm("listening"), { id: "voice-listening", duration: LISTEN_MS, icon: "🎤" });
    };

    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) accum += r[0].transcript + " ";
        else interim += r[0].transcript;
      }
      setLiveTranscript((accum + interim).trim());
    };

    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    recognition.onerror = (e: any) => {
      if (e.error === "no-speech") return;
      discarded = true;
      if (timer.id) clearTimeout(timer.id);
      setIsListening(false);
      setLiveTranscript("");
      toast.dismiss("voice-listening");
      if (e.error !== "aborted") toast.error(tm("captureFailed"));
    };

    recognition.onend = () => {
      if (discarded) return;
      if (!finishing && restarts < 40 && Date.now() - startedAt < LISTEN_MS) {
        restarts++;
        try { recognition.start(); return; } catch {}
      }
      finishing = true;
      if (timer.id) clearTimeout(timer.id);
      setIsListening(false);
      setLiveTranscript("");
      toast.dismiss("voice-listening");

      const transcript = accum.trim();
      if (!transcript) { toast.error(tm("notUnderstood")); return; }
      applyVoiceParsed(parseVoiceCustomer(transcript));
    };

    recognition.start();
  }, [proTools, requestMic, speechLang, tm, applyVoiceParsed]);

  const cancelVoiceConfirm = () => {
    setIsConfirmingVoice(false);
    setVoiceSummary(null);
    setVoiceMissing([]);
  };
  const confirmAndSave = () => {
    setIsConfirmingVoice(false);
    setVoiceSummary(null);
    setVoiceMissing([]);
    submitCustomer();
  };
  const completeMissingByVoice = () => {
    startVoiceCustomer();
  };

  const { cmdListening, stopCmd } = useVoiceConfirmCommand({
    active: proTools && isConfirmingVoice,
    hasMissing: voiceMissing.length > 0,
    speechLang,
    onConfirm: confirmAndSave,
    onEdit: cancelVoiceConfirm,
    onCompleteMissing: completeMissingByVoice,
    onFreeSpeechMissing: (transcript) => applyVoiceParsed(parseVoiceCustomer(transcript)),
    toasts: {
      listening: tm("voiceCmdListening"),
      confirmed: tm("voiceCmdConfirmed"),
      editing: tm("voiceCmdCancelled"),
      completing: tm("voiceCmdCompleting"),
      notUnderstood: tm("voiceCmdNotUnderstood"),
    },
    onToast: (m) => toast(m, { icon: "🎙️", duration: 4000 }),
  });

  useEffect(() => {
    return () => {
      if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch {} }
    };
  }, []);

  return (
    <div className="p-6 max-w-xl mx-auto">
      {micDialog}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/musteriler" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold brand-gradient-text">{t("customerNew.title")}</h1>
      </div>

      <Card className="kpi-tile border-0 shadow-none">
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">{t("customerNew.cardTitle")}</CardTitle>
          {proTools && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={startVoiceCustomer}
              className={cn(
                "gap-1.5 text-xs text-primary border-primary/20 hover:bg-primary/5 shrink-0",
                isListening ? "border-red-500 text-red-500 animate-pulse bg-red-50 dark:bg-red-950/20" : ""
              )}
            >
              <Mic className="h-3.5 w-3.5" />
              {tm("fillByVoice")}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Voice Listening Alert */}
            {isListening && !isConfirmingVoice && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold flex items-center gap-2">
                    <Mic className="h-4 w-4 text-red-500 animate-pulse" />
                    {tm("listening")}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => recognitionRef.current?.stop?.()}
                    className="h-7 px-2 text-xs hover:bg-red-500/20 text-red-600 shrink-0"
                  >
                    {tm("finishListening")}
                  </Button>
                </div>
                {liveTranscript && (
                  <p className="text-[11px] text-foreground/80 bg-background/60 rounded-lg px-2.5 py-1.5">
                    <span className="opacity-60">{tm("heard")}: </span>{liveTranscript}
                  </p>
                )}
                {voiceSummary && (
                  <div className="text-[11px] text-foreground/70 bg-background/60 rounded-lg px-2.5 py-1.5 space-y-0.5">
                    <p className="opacity-60">{tm("collectedSoFar")}</p>
                    <VoiceRow label={tm("fieldCustomer")} value={voiceSummary.full_name} emptyLabel={tm("notProvided")} />
                    <VoiceRow label={tm("lblPhone")} value={voiceSummary.phone} emptyLabel={tm("notProvided")} />
                  </div>
                )}
              </div>
            )}

            {/* Voice Confirmation Box */}
            {isConfirmingVoice && voiceSummary && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-primary">
                  <Check className="h-4 w-4" />
                  {tm("confirmTitle")}
                </h3>
                <div className="text-xs space-y-1.5 text-muted-foreground">
                  <VoiceRow label={tm("fieldCustomer")} value={voiceSummary.full_name} missing={voiceMissing.includes("full_name")} emptyLabel={tm("notProvided")} />
                  <VoiceRow label={tm("lblPhone")} value={voiceSummary.phone} missing={voiceMissing.includes("phone")} emptyLabel={tm("notProvided")} />
                </div>
                {voiceMissing.length > 0 && (
                  <p className="text-[11px] rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-2 text-amber-700 dark:text-amber-400">
                    {tm("missingHint")}
                  </p>
                )}
                {cmdListening && (
                  <div className="flex items-center justify-between gap-2 text-[11px] rounded-lg bg-red-500/10 border border-red-500/20 px-2.5 py-2 text-red-600">
                    <span className="flex items-center gap-1.5">
                      <Mic className="h-3.5 w-3.5 animate-pulse" />
                      {tm("voiceCmdListening")}
                    </span>
                    <button type="button" onClick={stopCmd} className="underline shrink-0">
                      {tm("voiceCmdStop")}
                    </button>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  {voiceMissing.length > 0 && (
                    <Button
                      size="sm"
                      type="button"
                      variant="secondary"
                      onClick={completeMissingByVoice}
                      className="flex-1 min-w-[140px] gap-1.5"
                    >
                      <Mic className="h-3.5 w-3.5" />
                      {tm("completeByVoice")}
                    </Button>
                  )}
                  <Button size="sm" type="button" onClick={confirmAndSave} className="flex-1 min-w-[120px]">
                    {tm("confirmSave")}
                  </Button>
                  <Button size="sm" type="button" variant="outline" onClick={cancelVoiceConfirm} className="flex-1 min-w-[100px]">
                    {tm("confirmEdit")}
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Ad Soyad *</Label>
                <Input
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  placeholder="Müşteri adı soyadı"
                  required
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Telefon *</Label>
                <Input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, phone: e.target.value }));
                    checkDuplicatePhone(e.target.value);
                  }}
                  placeholder="5xx xxx xx xx"
                  required
                />
                {dupMatch && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-400">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1">
                      Bu telefon <strong>{dupMatch.full_name}</strong> adına zaten kayıtlı.
                    </span>
                    <Link href={`/dashboard/musteriler/${dupMatch.id}`} className="underline shrink-0">
                      Görüntüle →
                    </Link>
                  </div>
                )}
              </div>
              <div className="col-span-2 space-y-1">
                <Label>E-posta</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="musteri@ornek.com"
                />
              </div>
              <div className="space-y-1">
                <Label>Doğum Tarihi</Label>
                <Input
                  type="date"
                  value={form.birth_date}
                  onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Cinsiyet</Label>
                <Select
                  value={form.gender}
                  onValueChange={(v) => setForm((f) => ({ ...f, gender: v ?? "" }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seçin..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kadin">Kadın</SelectItem>
                    <SelectItem value="erkek">Erkek</SelectItem>
                    <SelectItem value="diger">Diğer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Tercih Edilen Dil</Label>
                <Select
                  value={form.preferred_language}
                  onValueChange={(v) => setForm((f) => ({ ...f, preferred_language: v ?? "" }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Belirtilmedi" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_LANGUAGES.map((l) => (
                      <SelectItem key={l.code} value={l.code}>{l.flag} {l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Notlar</Label>
                <Input
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Özel not veya bilgi..."
                />
              </div>
            </div>

            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t("customerNew.submitButton")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
