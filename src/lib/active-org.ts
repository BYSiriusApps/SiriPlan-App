import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

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
  "org_id, role, staff_id, permissions_json, organizations(id, name, slug, plan, subscription_status, trial_ends_at, max_staff, max_appointments_monthly)";

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
  supabase: SupabaseClient
): Promise<ActiveMember | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: rows } = await supabase
    .from("org_members")
    .select(MEMBER_SELECT)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const memberships = (rows ?? []) as unknown as ActiveMember[];
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

/** Kullanıcının tüm işletme üyelikleri (işletme değiştirici için). */
export async function getMemberships(
  supabase: SupabaseClient
): Promise<Membership[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: rows } = await supabase
    .from("org_members")
    .select("org_id, role, organizations(name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  return (rows ?? []).map((r) => {
    const org = r.organizations as unknown as { name: string } | null;
    return { org_id: r.org_id, role: r.role, org_name: org?.name ?? "İşletme" };
  });
}

/** Kullanıcı platform (süper) admin mi? */
export async function isPlatformAdmin(
  supabase: SupabaseClient
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  // Env üzerinden acil erişim (DB satırı henüz yoksa)
  const envAdmins = (process.env.SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (user.email && envAdmins.includes(user.email.toLowerCase())) return true;

  const { data } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  return !!data;
}
