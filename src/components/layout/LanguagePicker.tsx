"use client";

import { useState, useEffect } from "react";
import { Globe } from "lucide-react";

const LOCALES = [
  { code: "tr", label: "TR", name: "Türkçe", flag: "🇹🇷" },
  { code: "en", label: "EN", name: "English", flag: "🇬🇧" },
  { code: "ar", label: "AR", name: "العربية", flag: "🇸🇦" },
  { code: "ru", label: "RU", name: "Русский", flag: "🇷🇺" },
];

export function LanguagePicker() {
  const [current, setCurrent] = useState("tr");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const match = document.cookie.match(/NEXT_LOCALE=([^;]+)/);
    if (match) setCurrent(match[1]);
  }, []);

  function switchLang(code: string) {
    document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=31536000; SameSite=Lax`;
    setCurrent(code);
    setOpen(false);
    window.location.reload();
  }

  const currentLocale = LOCALES.find((l) => l.code === current) ?? LOCALES[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Dil Seç / Language"
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-all text-[11px] font-medium"
      >
        <Globe className="h-3.5 w-3.5" />
        <span>{currentLocale.flag} {currentLocale.label}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute bottom-8 left-0 z-50 rounded-xl shadow-xl overflow-hidden"
            style={{
              background: "#161820",
              border: "1px solid rgba(255,255,255,0.1)",
              minWidth: "140px",
            }}
          >
            {LOCALES.map((loc) => (
              <button
                key={loc.code}
                onClick={() => switchLang(loc.code)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-white/70 hover:bg-white/10 hover:text-white transition-colors text-left"
                style={current === loc.code ? { background: "rgba(255,255,255,0.07)", color: "white" } : {}}
              >
                <span className="text-base">{loc.flag}</span>
                <span>{loc.name}</span>
                {current === loc.code && <span className="ml-auto text-[10px] text-primary">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
