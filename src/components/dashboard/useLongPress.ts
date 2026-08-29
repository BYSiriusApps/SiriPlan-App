"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Options {
  /** Kısa dokunuş — parmak/fare basılı tutma eşiğine ulaşmadan bırakıldı. */
  onTap: () => void;
  /** Basılı tutma eşiği aşıldı. */
  onLongPress: () => void;
  /** Eşik süresi (ms). */
  ms?: number;
}

/**
 * Tek bir düğmede "tek dokunuş" ile "basılı tutma"yı ayırır.
 *
 * Pointer olayları hem fareyi hem dokunmayı kapsar; klavye için Enter/Space
 * yalnızca `onTap` tetikler (basılı tutma klavyeden anlamlı değil).
 * `holding` bayrağı çağırana ilerleme animasyonu göstermesi için verilir.
 */
export function useLongPress({ onTap, onLongPress, ms = 450 }: Options) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longFired = useRef(false);
  const [holding, setHolding] = useState(false);

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setHolding(false);
  }, []);

  useEffect(() => clear, [clear]);

  const start = useCallback(() => {
    longFired.current = false;
    setHolding(true);
    timer.current = setTimeout(() => {
      longFired.current = true;
      setHolding(false);
      try {
        navigator.vibrate?.(60);
      } catch {
        /* vibrate desteklenmiyor */
      }
      onLongPress();
    }, ms);
  }, [ms, onLongPress]);

  const end = useCallback(() => {
    const wasLong = longFired.current;
    clear();
    if (!wasLong) onTap();
  }, [clear, onTap]);

  return {
    holding,
    handlers: {
      onPointerDown: (e: React.PointerEvent) => {
        if (e.button != null && e.button !== 0) return;
        // Örtük pointer yakalamayı bırak — aksi halde dokunmada parmak düğmeden
        // ayrılsa bile pointerleave tetiklenmez ve kaydırma "dokunuş" sayılır.
        try {
          (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
        } catch {
          /* yoksay */
        }
        start();
      },
      onPointerUp: () => end(),
      onPointerLeave: () => clear(),
      onPointerCancel: () => clear(),
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onTap();
        }
      },
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    },
  };
}
