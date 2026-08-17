"use client";

import { useEffect, useRef } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Galeri fotoğraflarını tam ekran gösterir.
 *
 * Radix/BaseUI Dialog KULLANILMIYOR: bu bileşenler içeriği portal ile <body>'ye
 * taşır, website paleti ise sayfanın kök sarmalayıcısındaki CSS değişkenleriyle
 * kuruluyor (bkz. websiteThemeStyle) — portal DOM ağacını kopardığı için renkler
 * kaybolurdu. Tam ekran siyah katman zaten palete ihtiyaç duymuyor.
 */
export function PhotoLightbox({
  photos, index, onClose, onNavigate, closeLabel,
}: {
  photos: { id: string; url: string }[];
  /** null ise kapalı. */
  index: number | null;
  onClose: () => void;
  onNavigate: (nextIndex: number) => void;
  closeLabel: string;
}) {
  const touchStartX = useRef<number | null>(null);
  const open = index !== null && photos.length > 0;

  // Klavye: Esc kapatır, ok tuşları gezinir.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNavigate((index! + 1) % photos.length);
      if (e.key === "ArrowLeft") onNavigate((index! - 1 + photos.length) % photos.length);
    }
    window.addEventListener("keydown", onKey);
    // Arkadaki sayfa kaydırılmasın (özellikle mobilde katmanın altından kayıyordu).
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, index, photos.length, onClose, onNavigate]);

  if (!open) return null;
  const current = photos[index!];
  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center animate-fade-up"
      onClick={onClose}
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(dx) < 40) return;
        onNavigate(dx < 0 ? (index! + 1) % photos.length : (index! - 1 + photos.length) % photos.length);
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={closeLabel}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
      >
        <X className="h-5 w-5" />
      </button>

      <img
        src={current.url}
        alt=""
        className="max-h-[85vh] max-w-[92vw] object-contain rounded-lg select-none"
        onClick={(e) => e.stopPropagation()}
      />

      {photos.length > 1 && (
        <>
          <button
            type="button"
            aria-label="←"
            onClick={(e) => { e.stopPropagation(); onNavigate((index! - 1 + photos.length) % photos.length); }}
            className="absolute left-2 sm:left-6 w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            aria-label="→"
            onClick={(e) => { e.stopPropagation(); onNavigate((index! + 1) % photos.length); }}
            className="absolute right-2 sm:right-6 w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 text-white text-xs tabular-nums">
            {index! + 1} / {photos.length}
          </div>
        </>
      )}
    </div>
  );
}
