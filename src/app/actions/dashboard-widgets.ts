"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type WidgetPref = {
  widget_key: string;
  visible: boolean;
  order_index: number;
};

export async function getDashboardWidgetPrefs(): Promise<WidgetPref[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("user_dashboard_widgets")
    .select("widget_key, visible, order_index")
    .eq("user_id", user.id)
    .order("order_index");

  return (data ?? []) as WidgetPref[];
}

export async function saveDashboardWidgetPrefs(
  orgId: string,
  prefs: WidgetPref[]
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Yetkisiz" };

  const { error: delErr } = await supabase
    .from("user_dashboard_widgets")
    .delete()
    .eq("user_id", user.id)
    .eq("org_id", orgId);

  if (delErr) return { error: delErr.message };

  if (prefs.length > 0) {
    const rows = prefs.map((p, i) => ({
      user_id: user.id,
      org_id: orgId,
      widget_key: p.widget_key,
      visible: p.visible,
      order_index: i,
    }));

    const { error: insErr } = await supabase.from("user_dashboard_widgets").insert(rows);
    if (insErr) return { error: insErr.message };
  }

  revalidatePath("/dashboard");
  return {};
}
