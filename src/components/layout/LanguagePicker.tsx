"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const LOCALES = [
  { code: "tr", label: "TR", name: "Türkçe", flag: "🇹🇷" },
  { code: "en", label: "EN", name: "English", flag: "🇬🇧" },
  { code: "ar", label: "AR", name: "العربية", flag: "🇸🇦" },
  { code: "ru", label: "RU", name: "Русский", flag: "🇷🇺" },
];

interface LanguagePickerProps {
  /** "dark" (default) = sidebar, "muted" = mobile nav / light backgrounds */
  variant?: "dark" | "muted";
}

export function LanguagePicker({ variant = "dark" }: LanguagePickerProps) {
  const router = useRouter();
  const [current, setCurrent] = useState("tr");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const match = document.cookie.match(/NEXT_LOCALE=([^;]+)/);
    if (match) setCurrent(match[1]);
  }, []);

  async function switchLang(code: string) {
    document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=31536000; SameSite=Lax`;
    setCurrent(code);
    setOpen(false);

    // Giriş yapmış kullanıcıysa hesabına kalıcı yaz — cihazdan/org'dan bağımsız kalıcı tercih
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.auth.updateUser({ data: { locale: code } });
    }

    router.refresh();
  }

  const currentLocale = LOCALES.find((l) => l.code === current) ?? LOCALES[0];

  const buttonClass =
    variant === "muted"
      ? "flex items-center gap-1 px-1.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all text-[11px] font-medium"
      : "flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 transition-all text-[11px] font-medium";

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} title="Dil Seç / Language" className={buttonClass}>
        <Globe className="h-3.5 w-3.5" />
        <span>{currentLocale.flag} {currentLocale.label}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 rounded-xl shadow-xl overflow-hidden bg-popover border border-border"
            style={{ minWidth: "140px" }}
          >
            {LOCALES.map((loc) => (
              <button
                key={loc.code}
                onClick={() => switchLang(loc.code)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-popover-foreground/70 hover:bg-accent hover:text-popover-foreground transition-colors text-left"
                style={current === loc.code ? { background: "var(--accent)", color: "var(--popover-foreground)" } : {}}
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
