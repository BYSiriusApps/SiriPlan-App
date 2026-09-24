"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Sesli randevu onay kutusu açıkken, kullanıcının "onayla" / "düzelt" / "eksikleri
 * ekle" gibi komutlarını dinleyip ilgili aksiyonu tetikler — böylece randevu ele
 * hiç dokunulmadan sesle tamamlanabilir.
 *
 * Ayrı bir `SpeechRecognition` örneği kullanır (booking tanımasıyla çakışmaz) ve
 * mikrofon izni bu noktada zaten verilmiş olduğundan `requestMic` diyaloğunu
 * TEKRAR göstermez — izin yoksa sessizce durur, kullanıcı düğmelerle devam eder.
 */

/** Türkçe küçük harf + aksan sadeleştirme (yalnızca komut eşleştirme için). */
function norm(s: string): string {
  return s
    .toLocaleLowerCase("tr-TR")
    .replace(/İ/g, "i").replace(/ı/g, "i").replace(/ç/g, "c").replace(/ğ/g, "g")
    .replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u")
    .replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

// norm() Kiril/Arap harflerini boşluğa çevirir; kalıplar TR + EN odaklı tutulur.
const CONFIRM_RE = /\bonayla\w*|\bkaydet\w*|\btamam\w*|\bevet\b|\bolur\b|\bdogru\w*|\bgonder\w*|\bconfirm\w*|\bsave\b|\byes\b|\bokey\b/;
const EDIT_RE = /\bduzelt\w*|\bduzenle\w*|\bdegistir\w*|\biptal\w*|\bvazgec\w*|\bhayir\b|\byanlis\w*|\bcancel\b|\bedit\b|\bwrong\b/;
const MISSING_RE = /\beksik\w*|\btamamla\w*|\btekrar\b|\bekle\b|\bcomplete\b|\bmissing\b/;

interface Opts {
  /** Onay kutusu görünür + Pro+ ise true. */
  active: boolean;
  /** Eksik alan var mı? (varsa "eksikleri ekle" komutu etkin) */
  hasMissing: boolean;
  /** SpeechRecognition dil kodu (useMicAccess.speechLang) */
  speechLang: string;
  onConfirm: () => void;
  onEdit: () => void;
  onCompleteMissing: () => void;
  /** Kısa geri bildirim toast'ları (i18n metinleri çağırandan gelir) */
  toasts?: {
    listening?: string;
    confirmed?: string;
    editing?: string;
    completing?: string;
    notUnderstood?: string;
  };
  onToast?: (msg: string) => void;
}

const LISTEN_MS = 7000;

export function useVoiceConfirmCommand(opts: Opts): { cmdListening: boolean; stopCmd: () => void } {
  const { active, hasMissing, speechLang, onConfirm, onEdit, onCompleteMissing, toasts, onToast } = opts;
  const [cmdListening, setCmdListening] = useState(false);
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const recRef = useRef<any>(null);
  const startedForRef = useRef(false);

  // Taze callback'lere ref'ten eriş (işleyiciler kurulduğu andakini yakalamasın).
  const cbRef = useRef({ onConfirm, onEdit, onCompleteMissing, hasMissing, toasts, onToast });
  useEffect(() => {
    cbRef.current = { onConfirm, onEdit, onCompleteMissing, hasMissing, toasts, onToast };
  });

  const stopCmd = useCallback(() => {
    startedForRef.current = true; // yeniden başlatma
    if (recRef.current) {
      try { recRef.current.abort(); } catch {}
      recRef.current = null;
    }
    setCmdListening(false);
  }, []);

  useEffect(() => {
    if (!active) {
      startedForRef.current = false;
      if (recRef.current) {
        try { recRef.current.abort(); } catch {}
        recRef.current = null;
      }
      setCmdListening(false);
      return;
    }
    if (startedForRef.current) return; // bu onay için zaten başladı
    startedForRef.current = true;

    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    let cancelled = false;
    // Booking tanımasının onend'i tamamlansın diye kısa gecikme.
    const startTimer = setTimeout(() => {
      if (cancelled) return;
      let rec: any; /* eslint-disable-line @typescript-eslint/no-explicit-any */
      try {
        rec = new SR();
      } catch {
        return;
      }
      recRef.current = rec;
      rec.lang = speechLang;
      rec.interimResults = false;
      rec.continuous = false;
      rec.maxAlternatives = 1;

      const stopTimer = setTimeout(() => {
        try { rec.stop(); } catch {}
      }, LISTEN_MS);

      rec.onstart = () => {
        setCmdListening(true);
        if (cbRef.current.toasts?.listening && cbRef.current.onToast) {
          cbRef.current.onToast(cbRef.current.toasts.listening);
        }
      };
      rec.onerror = () => {
        clearTimeout(stopTimer);
        setCmdListening(false);
        recRef.current = null;
      };
      rec.onend = () => {
        clearTimeout(stopTimer);
        setCmdListening(false);
        recRef.current = null;
      };
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      rec.onresult = (event: any) => {
        const said = norm(event.results?.[0]?.[0]?.transcript || "");
        if (!said) return;
        const c = cbRef.current;
        if (c.hasMissing && MISSING_RE.test(said)) {
          if (c.toasts?.completing && c.onToast) c.onToast(c.toasts.completing);
          c.onCompleteMissing();
        } else if (EDIT_RE.test(said)) {
          if (c.toasts?.editing && c.onToast) c.onToast(c.toasts.editing);
          c.onEdit();
        } else if (CONFIRM_RE.test(said)) {
          if (c.toasts?.confirmed && c.onToast) c.onToast(c.toasts.confirmed);
          c.onConfirm();
        } else if (c.toasts?.notUnderstood && c.onToast) {
          c.onToast(c.toasts.notUnderstood);
        }
      };

      try { rec.start(); } catch { recRef.current = null; }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(startTimer);
      if (recRef.current) {
        try { recRef.current.abort(); } catch {}
        recRef.current = null;
      }
      setCmdListening(false);
    };
  }, [active, speechLang]);

  return { cmdListening, stopCmd };
}
