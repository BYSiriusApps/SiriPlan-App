"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, Palette } from "lucide-react";
import { cn } from "@/lib/utils";

const THEMES = [
  {
    value: "light",
    label: "Pembe Rose",
    sectors: "Güzellik · Estetik · Manikür",
    swatch: "bg-rose-500",
    swatchColor: "#f43f5e",
  },
  {
    value: "ocean",
    label: "Okyanus Mavisi",
    sectors: "Klinik · Diş · Diyetisyen",
    swatch: "bg-teal-600",
    swatchColor: "#0d9488",
  },
  {
    value: "sage",
    label: "Doğa Yeşili",
    sectors: "Kuaför · Berber · Spa",
    swatch: "bg-emerald-700",
    swatchColor: "#047857",
  },
  {
    value: "dark",
    label: "Gece Modu",
    sectors: "Tüm sektörler",
    swatch: "bg-slate-800",
    swatchColor: "#1e293b",
  },
  {
    value: "sunset",
    label: "Turuncu Gün Batımı",
    sectors: "Tattoo · Makyaj · Nail",
    swatch: "bg-orange-500",
    swatchColor: "#f97316",
  },
  {
    value: "midnight",
    label: "Gece Yarısı Mor",
    sectors: "Premium · VIP · Lüks",
    swatch: "bg-violet-600",
    swatchColor: "#7c3aed",
  },
] as const;

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const current = THEMES.find((t) => t.value === theme) ?? THEMES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Renk teması seç"
        className="inline-flex items-center justify-center w-9 h-9 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {mounted ? (
          <span
            className="w-4 h-4 rounded-full border-2 border-border shadow-sm transition-colors duration-300"
            style={{ backgroundColor: current.swatchColor }}
          />
        ) : (
          <Palette className="h-4 w-4" />
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs font-medium text-muted-foreground pb-1">
            Renk Teması
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />

        {THEMES.map((t) => {
          const isActive = mounted && theme === t.value;
          return (
            <DropdownMenuItem
              key={t.value}
              onClick={() => setTheme(t.value)}
              className={cn(
                "flex items-center gap-3 cursor-pointer py-2.5 px-3 rounded-md",
                isActive && "bg-accent"
              )}
            >
              <span
                className="w-5 h-5 rounded-full shrink-0 border border-border/60 shadow-sm"
                style={{ backgroundColor: t.swatchColor }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-none">{t.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                  {t.sectors}
                </p>
              </div>
              {isActive && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
