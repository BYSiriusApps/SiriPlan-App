"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";

interface Props {
  q?: string;
  from?: string;
  to?: string;
}

export function RandevularFilters({ q, from, to }: Props) {
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

  const hasFilters = !!(q || from || to);

  return (
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
        onChange={(e) => pushParams({ from: e.target.value || undefined })}
        aria-label={t("randevularPage.dateFrom")}
        className="px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <span className="text-xs text-muted-foreground">{t("randevularPage.dateRangeSeparator")}</span>
      <input
        type="date"
        value={to ?? ""}
        onChange={(e) => pushParams({ to: e.target.value || undefined })}
        aria-label={t("randevularPage.dateTo")}
        className="px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />
      {hasFilters && (
        <button
          type="button"
          onClick={() => {
            setTerm("");
            router.push(pathname);
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <X className="h-3.5 w-3.5" />
          {t("randevularPage.clearFilters")}
        </button>
      )}
    </div>
  );
}
