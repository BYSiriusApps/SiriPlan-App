/**
 * Merkezî yetkilendirme (entitlement) yardımcıları.
 *
 * Deneme süresi boyunca işletme "Pro" plana denk özellikleri ücretsiz kullanır
 * (bkz. /dashboard/abonelik'teki "Deneme süresinde tüm Pro özellikleri ücretsiz"
 * vaadi). AI / API / White-Label yalnızca Business'a özeldir, denemede kapalıdır.
 *
 * ÖNEMLİ tasarım kararı: Deneme özellikleri org satırındaki feature_* kolonlarına
 * YAZILMAZ. Bunun yerine plan + trial_ends_at'ten CANLI hesaplanır. Böylece deneme
 * bittiğinde (trial_ends_at geçmişte) özellikler kendiliğinden kapanır — herkese
 * açık website, kampanya/gamification cron'ları vb. bedava sızmaz.
 *
 * Bu dosya saf TypeScript'tir (server-only import yok), hem sunucu hem istemci
 * bileşenlerinden güvenle import edilebilir.
 */

export interface EntitlementOrg {
  plan?: string | null;
  trial_ends_at?: string | null;
  feature_ai?: boolean | null;
  feature_campaigns?: boolean | null;
  feature_gamification?: boolean | null;
  feature_api?: boolean | null;
  feature_whitelabel?: boolean | null;
  feature_website?: boolean | null;
}

export interface Entitlements {
  feature_ai: boolean;
  feature_campaigns: boolean;
  feature_gamification: boolean;
  feature_api: boolean;
  feature_whitelabel: boolean;
  feature_website: boolean;
}

/** Deneme süresi hâlâ aktif mi? (plan trial ve bitiş tarihi gelecekte) */
export function isTrialActive(org: EntitlementOrg | null | undefined): boolean {
  return (
    org?.plan === "trial" &&
    !!org.trial_ends_at &&
    new Date(org.trial_ends_at) > new Date()
  );
}

/**
 * İşletmenin ETKİN özellik yetkileri.
 * - Aktif deneme → Pro seviyesi (website, kampanya, gamification açık).
 * - Diğer tüm durumlar → org satırındaki feature_* kolonları (ödeme sonrası
 *   webhook'un yazdığı gerçek değerler; deneme dolmuşsa hepsi false).
 */
export function getEntitlements(org: EntitlementOrg | null | undefined): Entitlements {
  if (isTrialActive(org)) {
    return {
      feature_ai: false,
      feature_campaigns: true,
      feature_gamification: true,
      feature_api: false,
      feature_whitelabel: false,
      feature_website: true,
    };
  }
  return {
    feature_ai: !!org?.feature_ai,
    feature_campaigns: !!org?.feature_campaigns,
    feature_gamification: !!org?.feature_gamification,
    feature_api: !!org?.feature_api,
    feature_whitelabel: !!org?.feature_whitelabel,
    feature_website: !!org?.feature_website,
  };
}

/**
 * Kayıt sırasında yeni işletmeye verilen limitler — deneme Pro'ya denk olduğundan
 * personel/randevu sınırsızdır. DB'deki randevu kotası trigger'ı (check_appointment_quota)
 * max_appointments_monthly kolonunu okuduğu için bu değer kayıtta kolona yazılmalıdır.
 */
export const TRIAL_PLAN_LIMITS = {
  max_staff: 999,
  max_appointments_monthly: 999999,
} as const;
