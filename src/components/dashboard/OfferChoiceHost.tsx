"use client";

import { useEffect, useRef, useState } from "react";
import { BadgePercent } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  registerOfferAsker,
  type OfferChoiceOffer,
  type OfferChoiceResult,
} from "@/lib/complete-appointment-client";

const money = (n: number) => `₺${n.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}`;

/**
 * Randevu tamamlanırken müşterinin kampanya indirim hakkı varsa soran pencere.
 * Panel layout'unda bir kez monte edilir; tamamlama yapan her ekran
 * (randevu detayı, takvim, liste, bekleyen işler) aynı pencereyi kullanır.
 */
export function OfferChoiceHost() {
  const [offers, setOffers] = useState<OfferChoiceOffer[] | null>(null);
  const resolver = useRef<((v: OfferChoiceResult) => void) | null>(null);

  useEffect(() => {
    registerOfferAsker(
      (o) =>
        new Promise<OfferChoiceResult>((resolve) => {
          // Önceden açık bekleyen bir soru varsa vazgeçmiş say.
          resolver.current?.(null);
          resolver.current = resolve;
          setOffers(o);
        })
    );
    return () => {
      registerOfferAsker(null);
      resolver.current?.(null);
      resolver.current = null;
    };
  }, []);

  function answer(v: OfferChoiceResult) {
    resolver.current?.(v);
    resolver.current = null;
    setOffers(null);
  }

  return (
    <Dialog open={!!offers} onOpenChange={(open) => { if (!open) answer(null); }}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BadgePercent className="h-5 w-5 text-primary" /> Kampanya indirim hakkı
          </DialogTitle>
          <DialogDescription>
            Bu müşterinin kullanılabilir bir kampanya indirimi var. Uygularsanız randevu tutarı indirimli yazılır,
            hak kullanıldı sayılır ve gelir-gider/raporlarda ödenen tutar görünür.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {(offers ?? []).map((o) => (
            <div key={o.log_id} className="rounded-lg border p-3 space-y-2">
              <div>
                <p className="font-medium text-sm">{o.campaign_name}</p>
                <p className="text-xs text-muted-foreground">
                  {o.label} · {new Date(`${o.valid_until}T12:00:00Z`).toLocaleDateString("tr-TR", { day: "numeric", month: "long", timeZone: "UTC" })} tarihine kadar
                </p>
                <p className="text-sm mt-1">
                  <span className="text-muted-foreground line-through">{money(o.final_price + o.discount_amount)}</span>{" "}
                  <span className="font-bold text-primary">{money(o.final_price)}</span>{" "}
                  <span className="text-xs text-muted-foreground">(−{money(o.discount_amount)})</span>
                </p>
              </div>
              <Button size="sm" className="w-full" onClick={() => answer(o.log_id)}>
                İndirimi uygula ve tamamla
              </Button>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <Button variant="outline" onClick={() => answer("none")}>
            İndirimsiz tamamla (hak saklı kalır)
          </Button>
          <Button variant="ghost" onClick={() => answer(null)}>
            Vazgeç
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
