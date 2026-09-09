"use client";

/**
 * Panel genelinde plan-bağımlı UI yetkileri için hafif bağlam.
 *
 * Sunucuda (dashboard/layout) aktif işletmenin planından hesaplanır, istemci
 * bileşenlerine tek yerden dağıtılır — her mikrofon/özellik butonu ayrı
 * `/api/org` çağrısı yapmasın. GERÇEK yetkilendirme yine API rotalarında
 * (403) yapılır; bu yalnızca butonları tutarlı göstermek/gizlemek içindir.
 */

import { createContext, useContext, type ReactNode } from "react";

interface PlanState {
  plan: string;
  /** "Pro rozetli" araçlar (sesli asistan, bekleme listesi vb.) açık mı?
   *  Pro / Business / aktif deneme. Bkz. lib/entitlements → hasProTools. */
  proTools: boolean;
}

const PlanCtx = createContext<PlanState>({ plan: "trial", proTools: false });

export function PlanProvider({ value, children }: { value: PlanState; children: ReactNode }) {
  return <PlanCtx.Provider value={value}>{children}</PlanCtx.Provider>;
}

export function usePlan(): PlanState {
  return useContext(PlanCtx);
}
