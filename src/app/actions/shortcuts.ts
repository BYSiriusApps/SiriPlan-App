"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ShortcutItem = {
  id?: string;
  href: string;
  label: string;
  icon_name: string;
  color: string;
  order_index: number;
};

export async function getUserShortcuts(): Promise<ShortcutItem[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("user_shortcuts")
    .select("id, href, label, icon_name, color, order_index")
    .eq("user_id", user.id)
    .order("order_index");

  return (data ?? []) as ShortcutItem[];
}

export async function saveUserShortcuts(
  orgId: string,
  shortcuts: ShortcutItem[]
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Yetkisiz" };

  // Replace all shortcuts for this user+org atomically
  const { error: delErr } = await supabase
    .from("user_shortcuts")
    .delete()
    .eq("user_id", user.id)
    .eq("org_id", orgId);

  if (delErr) return { error: delErr.message };

  if (shortcuts.length > 0) {
    const rows = shortcuts.map((s, i) => ({
      user_id: user.id,
      org_id: orgId,
      href: s.href,
      label: s.label,
      icon_name: s.icon_name,
      color: s.color,
      order_index: i,
    }));

    const { error: insErr } = await supabase.from("user_shortcuts").insert(rows);
    if (insErr) return { error: insErr.message };
  }

  revalidatePath("/dashboard");
  return {};
}
