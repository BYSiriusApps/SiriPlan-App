"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
// Windows bayrak emojilerini göstermez (TR/GB harfleri çıkar) — ana sayfadaki
// gibi yerel SVG bayraklar kullanılır.
import { FlagIcon } from "@/components/marketing/FlagIcon";

const LOCALES: { code: "tr" | "en" | "ar" | "ru"; label: string; name: string }[] = [
  { code: "tr", label: "TR", name: "Türkçe" },
  { code: "en", label: "EN", name: "English" },
  { code: "ar", label: "AR", name: "العربية" },
  { code: "ru", label: "RU", name: "Русский" },
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
      ? "flex items-center gap-1.5 px-1.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all text-[11px] font-semibold"
      : "flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 transition-all text-[11px] font-semibold";

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} title="Dil Seç / Language" className={buttonClass}>
        <FlagIcon code={currentLocale.code} className="h-5 w-5" />
        <span>{currentLocale.label}</span>
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 min-w-[160px] rounded-xl border border-border bg-popover p-1 shadow-xl">
            {LOCALES.map((loc) => (
              <button
                key={loc.code}
                onClick={() => switchLang(loc.code)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-colors ${
                  current === loc.code
                    ? "bg-accent text-popover-foreground"
                    : "text-popover-foreground/70 hover:bg-accent/60 hover:text-popover-foreground"
                }`}
              >
                <FlagIcon code={loc.code} className="h-5 w-5" />
                <span>{loc.name}</span>
                {current === loc.code && <span className="ml-auto text-xs text-primary">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
