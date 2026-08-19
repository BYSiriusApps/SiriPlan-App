"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowDownUp, CalendarDays, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  q?: string;
  from?: string;
  to?: string;
  /** Filtre çubuğundaki personel listesi (aktif personel). */
  staff?: { id: string; full_name: string }[];
  staffId?: string;
  sort?: string;
  bugun?: boolean;
}

export function RandevularFilters({ q, from, to, staff = [], staffId, sort, bugun }: Props) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [term, setTerm] = useState(q ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setTerm(q ?? ""), [q]);

  function pushParams(overrides: Record<string, string | undefined>) {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(overrides)) {
      if (value) sp.set(key, value);
      else sp.delete(key);
    }
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function handleSearchChange(value: string) {
    setTerm(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      pushParams({ q: value.trim() || undefined });
    }, 400);
  }

  const hasFilters = !!(q || from || to || staffId || sort || bugun);

  const sortOptions = [
    { value: undefined, label: t("randevularPage.sortDefault") },
    { value: "yeni", label: t("randevularPage.sortNewest") },
    { value: "eski", label: t("randevularPage.sortOldest") },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            id="randevu-search"
            value={term}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t("randevularPage.searchPlaceholder")}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <input
          type="date"
          value={from ?? ""}
          onChange={(e) => pushParams({ from: e.target.value || undefined, bugun: undefined })}
          aria-label={t("randevularPage.dateFrom")}
          className="px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <span className="text-xs text-muted-foreground">{t("randevularPage.dateRangeSeparator")}</span>
        <input
          type="date"
          value={to ?? ""}
          onChange={(e) => pushParams({ to: e.target.value || undefined, bugun: undefined })}
          aria-label={t("randevularPage.dateTo")}
          className="px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setTerm("");
              // Durum (status) filtresi ayrı bir bileşende ve ayrı bir chip
              // satırında; "filtreleri temizle" onu da silmesin diye korunur.
              const sp = new URLSearchParams(searchParams.toString());
              const status = sp.get("status");
              const next = new URLSearchParams();
              if (status) next.set("status", status);
              const qs = next.toString();
              router.push(qs ? `${pathname}?${qs}` : pathname);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            {t("randevularPage.clearFilters")}
          </button>
        )}
      </div>

      {/* Hızlı filtreler: bugün · personel · sıralama */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() =>
            // "Bugün" ile elle seçilen tarih aralığı aynı anda anlamlı değil:
            // biri açılırken diğeri temizlenir, aksi halde kesişimleri boş liste verir.
            pushParams({ bugun: bugun ? undefined : "1", from: undefined, to: undefined })
          }
          className={cn(
            "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors",
            bugun ? "bg-primary text-primary-foreground border-primary shadow-sm" : "border-border hover:bg-accent"
          )}
        >
          <CalendarDays className="h-3.5 w-3.5" />
          {t("randevularPage.today")}
        </button>

        {staff.length > 0 && (
          <select
            value={staffId ?? ""}
            onChange={(e) => pushParams({ personel: e.target.value || undefined })}
            className={cn(
              "px-2.5 py-1.5 rounded-lg border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary",
              staffId ? "border-primary text-foreground font-medium" : "border-border text-muted-foreground"
            )}
          >
            <option value="">{t("randevularPage.staffAll")}</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
              </option>
            ))}
          </select>
        )}

        <div className="flex items-center gap-1">
          <ArrowDownUp className="h-3.5 w-3.5 text-muted-foreground" />
          {sortOptions.map((opt) => (
            <button
              key={opt.value ?? "default"}
              type="button"
              onClick={() => pushParams({ sirala: opt.value })}
              className={cn(
                "px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors",
                (sort ?? undefined) === opt.value
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "border-border hover:bg-accent"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
