"use client";

import { useRouter } from "next/navigation";
import { type PricingCurrency } from "@/lib/pricing";

interface CurrencyToggleProps {
  currentCurrency: PricingCurrency;
}

export function CurrencyToggle({ currentCurrency }: CurrencyToggleProps) {
  const router = useRouter();

  const handleSelect = (currency: PricingCurrency) => {
    document.cookie = `pricing_currency=${currency}; path=/; max-age=31536000; SameSite=Lax`;
    router.refresh();
  };

  return (
    <div className="flex flex-col items-center justify-center mb-8">
      <div className="inline-flex items-center p-1 rounded-xl bg-muted/60 border border-border gap-1 text-xs shadow-inner">
        {(["TRY", "USD", "EUR"] as const).map((curr) => {
          const isActive = currentCurrency === curr;
          const label = curr === "TRY" ? "₺ TL (TRY)" : curr === "USD" ? "$ USD" : "€ EUR";
          return (
            <button
              key={curr}
              onClick={() => handleSelect(curr)}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all duration-150 ${
                isActive
                  ? "bg-background text-foreground shadow border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
