"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Users, UserCog, Scissors, Loader2 } from "lucide-react";

interface Customer { id: string; full_name: string; phone: string | null }
interface StaffMember { id: string; full_name: string; role: string }
interface Service { id: string; name: string; price: number; duration_minutes: number }
interface SearchResults { customers: Customer[]; staff: StaffMember[]; services: Service[] }

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 1) { setResults(null); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) setResults(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults(null); return; }
    debounceRef.current = setTimeout(() => search(query.trim()), 280);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  // Ctrl+K / Cmd+K to focus
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
        setResults(null);
        inputRef.current?.blur();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    setResults(null);
    router.push(href);
  }

  const hasResults = results && (results.customers.length > 0 || results.staff.length > 0 || results.services.length > 0);
  const noResults = results && !hasResults;

  return (
    <div ref={containerRef} className="relative px-3 pb-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none"
          style={{ color: "rgba(255,255,255,0.3)" }} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder="Ara… (Ctrl+K)"
          className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg outline-none transition-all"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.09)",
            color: "rgba(255,255,255,0.85)",
          }}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setResults(null); }}
            className="absolute right-2 top-1/2 -translate-y-1/2"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            <X className="h-3 w-3" />
          </button>
        )}
        {loading && !query && (
          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin"
            style={{ color: "rgba(255,255,255,0.3)" }} />
        )}
      </div>

      {open && query.length > 0 && (
        <div
          className="absolute left-3 right-3 mt-1 rounded-xl overflow-hidden z-[200] shadow-2xl"
          style={{
            background: "#16181f",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {loading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: "rgba(255,255,255,0.4)" }} />
            </div>
          )}

          {!loading && noResults && (
            <p className="text-xs text-center py-4" style={{ color: "rgba(255,255,255,0.35)" }}>
              Sonuç bulunamadı
            </p>
          )}

          {!loading && hasResults && (
            <div className="max-h-72 overflow-y-auto py-1">
              {results.customers.length > 0 && (
                <>
                  <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: "rgba(255,255,255,0.3)" }}>
                    Müşteriler
                  </p>
                  {results.customers.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => go(`/dashboard/musteriler/${c.id}`)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors"
                      style={{ color: "rgba(255,255,255,0.75)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: "rgba(99,102,241,0.2)" }}>
                        <Users className="h-3 w-3" style={{ color: "#6366f1" }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{c.full_name}</p>
                        {c.phone && <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.35)" }}>{c.phone}</p>}
                      </div>
                    </button>
                  ))}
                </>
              )}

              {results.staff.length > 0 && (
                <>
                  <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: "rgba(255,255,255,0.3)" }}>
                    Personel
                  </p>
                  {results.staff.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => go(`/dashboard/personel/${s.id}`)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors"
                      style={{ color: "rgba(255,255,255,0.75)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: "rgba(168,85,247,0.2)" }}>
                        <UserCog className="h-3 w-3" style={{ color: "#a855f7" }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{s.full_name}</p>
                        <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.35)" }}>{s.role}</p>
                      </div>
                    </button>
                  ))}
                </>
              )}

              {results.services.length > 0 && (
                <>
                  <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: "rgba(255,255,255,0.3)" }}>
                    Hizmetler
                  </p>
                  {results.services.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => go(`/dashboard/hizmetler`)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors"
                      style={{ color: "rgba(255,255,255,0.75)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: "rgba(236,72,153,0.2)" }}>
                        <Scissors className="h-3 w-3" style={{ color: "#ec4899" }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{s.name}</p>
                        <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.35)" }}>
                          ₺{Number(s.price).toLocaleString("tr-TR")} · {s.duration_minutes} dk
                        </p>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
