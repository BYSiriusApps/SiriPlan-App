import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

const STATUS_KEYS = ["talep", "onaylandi", "tamamlandi", "gelmedi", "iptal"] as const;

/**
 * Bir personelin randevu istatistiklerini (kümülatif sayaç) ve durum
 * değişikliği geçmişini (audit_logs) döner — personel detay sayfasındaki
 * "Personel Aktiviteleri" kartı için.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });
  if (member.role === "staff") return NextResponse.json({ error: "Yetersiz yetki" }, { status: 403 });

  const [{ data: appts }, { data: history }] = await Promise.all([
    supabase
      .from("appointments")
      .select("status")
      .eq("org_id", member.org_id)
      .eq("staff_id", id),
    supabase
      .from("audit_logs")
      .select("id, created_at, old_data, new_data")
      .eq("org_id", member.org_id)
      .eq("table_name", "appointments")
      .eq("action", "appointment_status_change")
      .contains("new_data", { staff_id: id })
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const counts: Record<(typeof STATUS_KEYS)[number], number> = {
    talep: 0, onaylandi: 0, tamamlandi: 0, gelmedi: 0, iptal: 0,
  };
  for (const a of appts ?? []) {
    if (a.status in counts) counts[a.status as (typeof STATUS_KEYS)[number]]++;
  }

  return NextResponse.json({ counts, history: history ?? [] });
}
