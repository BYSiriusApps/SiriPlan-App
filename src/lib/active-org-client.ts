"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

// Client component'lerde aktif işletme üyeliği.
// Sunucu tarafındaki lib/active-org.ts ile aynı seçim mantığı:
// active_org cookie'si → yoksa en eski üyelik.
export async function getActiveMemberClient(
  supabase: SupabaseClient
): Promise<{ org_id: string; role: string; staff_id: string | null } | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: rows } = await supabase
    .from("org_members")
    .select("org_id, role, staff_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (!rows || rows.length === 0) return null;

  const activeOrgId =
    typeof document !== "undefined"
      ? document.cookie.match(/(?:^|;\s*)active_org=([^;]*)/)?.[1]
      : undefined;

  return rows.find((r) => r.org_id === activeOrgId) ?? rows[0];
}
