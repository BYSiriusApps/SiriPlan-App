"use client";

import { useCallback, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Phone, Star, Loader2, X } from "lucide-react";

interface CustomerHit {
  id: string;
  full_name: string;
  phone: string;
  email?: string | null;
  total_visits?: number;
}

interface Props {
  name: string;
  phone: string;
  email: string;
  onNameChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onEmailChange: (v: string) => void;
}

/**
 * Randevu formlarında müşteri ad/telefon alanı — yazarken kayıtlı müşterileri
 * arar, seçilince otomatik doldurur. Mükerrer müşteri kaydı oluşturmasını
 * önlemek için (bkz. QuickBookSheet.tsx'teki aynı desen) personel elle
 * yazmak yerine var olan müşteriyi bulup seçebilir.
 */
export function CustomerSearchField({ name, phone, email, onNameChange, onPhoneChange, onEmailChange }: Props) {
  const [results, setResults] = useState<CustomerHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchCustomers = useCallback((q: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!q.trim()) { setResults([]); return; }
    searchTimerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/customers?q=${encodeURIComponent(q)}&limit=6`);
        const json = await res.json();
        setResults(json.customers ?? []);
      } finally {
        setLoading(false);
      }
    }, 280);
  }, []);

  function pickCustomer(c: CustomerHit) {
    onNameChange(c.full_name);
    onPhoneChange(c.phone);
    onEmailChange(c.email ?? "");
    setResults([]);
    setPicked(true);
  }

  function clearCustomer() {
    onNameChange("");
    onPhoneChange("");
    onEmailChange("");
    setResults([]);
    setPicked(false);
  }

  if (picked) {
    return (
      <div className="space-y-1">
        <Label>Müşteri</Label>
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-primary bg-primary/5">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{name}</p>
            <p className="text-xs text-muted-foreground">{phone}</p>
          </div>
          <button type="button" onClick={clearCustomer} className="text-muted-foreground hover:text-foreground shrink-0">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="col-span-2 space-y-1">
        <Label>Ad Soyad *</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-8"
            value={name}
            onChange={(e) => {
              onNameChange(e.target.value);
              searchCustomers(e.target.value);
            }}
            placeholder="Müşteri adı — kayıtlı müşteriler önerilir"
            required
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
          )}
        </div>

        {results.length > 0 && (
          <div className="relative">
            <div className="absolute top-1 left-0 right-0 z-20 rounded-xl border bg-background shadow-lg overflow-hidden">
              {results.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => pickCustomer(c)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors border-b last:border-0"
                >
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                    {c.full_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.full_name}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Phone className="h-2.5 w-2.5" />{c.phone}
                      {(c.total_visits ?? 0) > 0 && (
                        <span className="ml-1 flex items-center gap-0.5">
                          <Star className="h-2.5 w-2.5 text-amber-500" />{c.total_visits} ziyaret
                        </span>
                      )}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Telefon *</Label>
          <Input
            type="tel"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="5xx xxx xx xx"
            required
          />
        </div>
        <div className="space-y-1">
          <Label>E-posta</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="opsiyonel"
          />
        </div>
      </div>
    </>
  );
}
