"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

// Client component'lerde aktif işletme üyeliği.
// Sunucu tarafındaki lib/active-org.ts ile aynı seçim mantığı:
// active_org cookie'si → yoksa en eski üyelik.
//
// `knownUserId` opsiyonel: çağıran taraf kendi `auth.getUser()` sonucunu
// zaten aldıysa (ör. ayarlar/page.tsx) buraya geçip ikinci bir Supabase Auth
// ağ turunu (getUser() yerel değil, sunucuya giden bir istek) atlayabilir.
export async function getActiveMemberClient(
  supabase: SupabaseClient,
  knownUserId?: string
): Promise<{ org_id: string; role: string; staff_id: string | null } | null> {
  let userId = knownUserId;
  if (!userId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    userId = user.id;
  }

  const { data: rows } = await supabase
    .from("org_members")
    .select("org_id, role, staff_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (!rows || rows.length === 0) return null;

  const activeOrgId =
    typeof document !== "undefined"
      ? document.cookie.match(/(?:^|;\s*)active_org=([^;]*)/)?.[1]
      : undefined;

  return rows.find((r) => r.org_id === activeOrgId) ?? rows[0];
}
