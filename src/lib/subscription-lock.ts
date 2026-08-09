export type SubscriptionLockReason = "trial_expired" | "payment_failed";

export interface SubscriptionLock {
  locked: boolean;
  reason: SubscriptionLockReason | null;
}

// Stripe abonelik durumları: sadece bunlar "ödeme sorunu" sayılır.
// "active" ve deneme-içi durumlar kilitlemez.
const FAILED_STATUSES = new Set(["past_due", "canceled", "unpaid", "incomplete_expired"]);

/**
 * Deneme süresi dolan veya ödemesi başarısız olan işletmeler salt-okunur moda
 * geçer: paneli görüntüleyebilir ama yeni kayıt/güncelleme yapamazlar.
 * İstisna: /dashboard/ayarlar ve abonelik/ödeme ile ilgili uç noktalar
 * (bkz. src/proxy.ts EXEMPT_API_PREFIXES).
 */
export function getSubscriptionLock(org: {
  plan: string;
  subscription_status: string;
  trial_ends_at?: string | null;
}): SubscriptionLock {
  const trialExpired =
    org.plan === "trial" && !!org.trial_ends_at && new Date(org.trial_ends_at) < new Date();
  if (trialExpired) return { locked: true, reason: "trial_expired" };

  if (org.plan !== "trial" && FAILED_STATUSES.has(org.subscription_status)) {
    return { locked: true, reason: "payment_failed" };
  }

  return { locked: false, reason: null };
}
