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
 * "Pro rozetli" araçlara erişim var mı? — panelde sesli asistan (mikrofonla
 * randevu/stok komutu), müşteri skoru, PDF rapor export.
 * Fiyatlandırmada bu 3 grup Starter'da "dahil değil" (✕); Pro + Business +
 * aktif deneme'de açık.
 *
 * Not: Bu grup için ayrı `feature_*` kolonu yok — plandan CANLI hesaplanır,
 * deneme bitince kendiliğinden kapanır. Yeni bir Pro-üstü araç eklerken
 * buradan geçir. (Website / kampanya / gamification / AI'nın kendi
 * feature_* kolonları var; onlar getEntitlements ile kontrol edilir.)
 */
export function hasProTools(org: EntitlementOrg | null | undefined): boolean {
  return isTrialActive(org) || org?.plan === "pro" || org?.plan === "business";
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
 * Plana bağlı aylık kullanım sınırları — TEK kaynak. stripe/config.ts (plan
 * satın alınınca org satırına yazılan max_staff / max_appointments_monthly),
 * API kontrolleri ve arayüz buradan okur; böylece rakamlar birbirinden sapmaz.
 *
 * - mini: tek kullanıcı/personel, ayda 200 randevu, ayda 200 müşteri WhatsApp
 *   mesajı (platform şablon mesajları — bkz. lib/wa-templates/send.ts).
 * - starter: ayda 1 kampanya (kampanya modülü açık ama sayısı sınırlı).
 * Diğer planlar bu sınırlardan muaftır (null).
 */
export const PLAN_USAGE_LIMITS = {
  mini: { staff: 1, appointments: 200, waMessages: 200 },
  starter: { campaigns: 1 },
} as const;

/** Aktif denemede (Pro'ya denk) aylık sınır yoktur; yalnızca ödenen plan sınırlar. */
function paidPlan(org: EntitlementOrg | null | undefined): string | null {
  if (!org || isTrialActive(org)) return null;
  return org.plan ?? null;
}

/** Ayda gönderilebilecek müşteri WhatsApp şablon mesajı sayısı; sınırsızsa null. */
export function monthlyWaMessageLimit(org: EntitlementOrg | null | undefined): number | null {
  return paidPlan(org) === "mini" ? PLAN_USAGE_LIMITS.mini.waMessages : null;
}

/** Ayda oluşturulabilecek kampanya sayısı; sınırsızsa null. */
export function monthlyCampaignLimit(org: EntitlementOrg | null | undefined): number | null {
  return paidPlan(org) === "starter" ? PLAN_USAGE_LIMITS.starter.campaigns : null;
}

/**
 * Tek bir kampanyanın alıcı üst sınırı. Toplu gönderim işletmenin kendi
 * WhatsApp/SMS hattından gittiği için, çok geniş bir listeye tek seferde
 * yüklenip numaranın kalite puanını düşürmesi (kısıtlanma/ban) ve gönderimin
 * sunucu süre sınırına takılması engellenir. Sınırı aşan segment gönderilmez;
 * işletme segmenti daraltıp birkaç kampanyaya böler.
 */
export const CAMPAIGN_RECIPIENT_LIMITS = { starter: 500, default: 2000 } as const;

export function campaignRecipientLimit(org: EntitlementOrg | null | undefined): number {
  return paidPlan(org) === "starter"
    ? CAMPAIGN_RECIPIENT_LIMITS.starter
    : CAMPAIGN_RECIPIENT_LIMITS.default;
}

/**
 * SiriPlan'ın AYRI kampanya numarasından (WHATSAPP_CAMPAIGN_*) gönderilen
 * pazarlama şablon mesajı için aylık işletme kotası. Meta ücreti SiriPlan'a
 * ait olduğundan sınırsız bırakılmaz; kendi hesabından gönderen akış etkilenmez.
 */
export const CAMPAIGN_WA_MONTHLY_LIMITS = { starter: 500, default: 3000 } as const;

export function monthlyCampaignWaLimit(org: EntitlementOrg | null | undefined): number {
  return paidPlan(org) === "starter"
    ? CAMPAIGN_WA_MONTHLY_LIMITS.starter
    : CAMPAIGN_WA_MONTHLY_LIMITS.default;
}

/** Tek kullanıcılı plan mı? (Mini: ek personel/kullanıcı daveti yok.) */
export function isSingleUserPlan(org: EntitlementOrg | null | undefined): boolean {
  return paidPlan(org) === "mini";
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
