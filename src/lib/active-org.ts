import { cookies } from "next/headers";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient, getSessionUser } from "@/lib/supabase/server";

export const ACTIVE_ORG_COOKIE = "active_org";

export interface ActiveOrgInfo {
  id: string;
  name: string;
  slug?: string;
  plan: string;
  subscription_status: string;
  trial_ends_at?: string | null;
  max_staff?: number | null;
  max_appointments_monthly?: number | null;
  feature_ai?: boolean | null;
  feature_campaigns?: boolean | null;
  feature_gamification?: boolean | null;
  feature_api?: boolean | null;
  feature_whitelabel?: boolean | null;
  feature_website?: boolean | null;
  timezone?: string | null;
}

export interface ActiveMember {
  org_id: string;
  role: string;
  staff_id: string | null;
  permissions_json: Record<string, boolean> | null;
  organizations: ActiveOrgInfo | null;
}

export interface Membership {
  org_id: string;
  role: string;
  org_name: string;
}

const MEMBER_SELECT =
  // `timezone` burada seçiliyor ki takvim/randevular/ana sayfa aynı bilgi için
  // ayrıca `organizations.select("timezone")` sorgusu atmasın — o sorgu, veriye
  // ihtiyaç duyan her sayfada zincire fazladan bir seri gidiş-dönüş ekliyordu.
  "org_id, role, staff_id, permissions_json, organizations(id, name, slug, plan, subscription_status, trial_ends_at, max_staff, max_appointments_monthly, feature_ai, feature_campaigns, feature_gamification, feature_api, feature_whitelabel, feature_website, timezone)";

/**
 * Kullanıcının org_members satırları — İSTEK BAŞINA TEK SORGU.
 *
 * NEDEN: Bu satırlar tek bir sayfa geçişinde en az üç kez isteniyordu
 * (dashboard/layout.tsx'in getActiveMember'ı, aynı layout'un getMemberships'i
 * ve sayfanın kendi getActiveMember'ı). Üçü de aynı kullanıcı için aynı sonucu
 * döndürüyordu. `cache()` anahtarı `userId` olduğu için sonuç asla başka bir
 * kullanıcıya gitmez ve React önbelleği zaten tek istek/render ile sınırlıdır.
 *
 * İstemci parametre olarak alınmaz: `cache()` argüman kimliğine göre anahtarlar
 * ve her çağıran kendi `createClient()` örneğini geçtiği için önbellek hiç
 * tutmazdı. Burada üretilen istemci de aynı istek çerezlerine bağlıdır, yani
 * RLS bağlamı çağıranınkiyle birebir aynıdır. `_supabase` parametresi yalnızca
 * ~60 çağrı yerini değiştirmemek için duruyor; kasıtlı olarak kullanılmıyor.
 */
const loadMembershipRows = cache(async (userId: string): Promise<ActiveMember[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("org_members")
    .select(MEMBER_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  return (data ?? []) as unknown as ActiveMember[];
});

/**
 * Kullanıcının aktif işletme üyeliğini döndürür.
 *
 * Seçim sırası:
 *  1. `active_org` cookie'sindeki işletme (üyelik hâlâ geçerliyse)
 *  2. En eski üyelik (ilk kaydolunan işletme)
 *
 * Eski kodda `.single()` kullanılıyordu; birden fazla işletmeye üye
 * kullanıcılarda bu sorgu hata verip kullanıcıyı /auth/kayit'a atıyordu
 * (veri kaybı gibi görünüyordu). Bu yardımcı o sınıf hatayı bitirir.
 */
export async function getActiveMember(
  _supabase?: SupabaseClient
): Promise<ActiveMember | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const memberships = await loadMembershipRows(user.id);
  if (memberships.length === 0) return null;

  let activeOrgId: string | undefined;
  try {
    const cookieStore = await cookies();
    activeOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;
  } catch {
    // cookies() erişilemeyen bağlamlarda ilk üyeliğe düş
  }

  return (
    memberships.find((m) => m.org_id === activeOrgId) ?? memberships[0]
  );
}

/**
 * Kullanıcının tüm işletme üyelikleri (işletme değiştirici için).
 *
 * Ayrı bir sorgu atmaz: `loadMembershipRows` zaten aynı satırları (isim dahil)
 * getirdiği için sonuç ondan türetilir — dashboard/layout.tsx'te bu, tek başına
 * bir auth çağrısı + bir org_members sorgusu tasarrufu demek.
 */
export async function getMemberships(
  _supabase?: SupabaseClient
): Promise<Membership[]> {
  const user = await getSessionUser();
  if (!user) return [];

  const rows = await loadMembershipRows(user.id);
  return rows.map((r) => ({
    org_id: r.org_id,
    role: r.role,
    org_name: r.organizations?.name ?? "İşletme",
  }));
}

/** platform_admins satırı — istek başına tek sorgu (bkz. loadMembershipRows). */
const loadPlatformAdmin = cache(async (userId: string): Promise<boolean> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
});

/** Kullanıcı platform (süper) admin mi? */
export async function isPlatformAdmin(
  _supabase?: SupabaseClient
): Promise<boolean> {
  const user = await getSessionUser();
  if (!user) return false;

  // Env üzerinden acil erişim (DB satırı henüz yoksa)
  const envAdmins = (process.env.SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (user.email && envAdmins.includes(user.email.toLowerCase())) return true;

  return loadPlatformAdmin(user.id);
}
