import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

/**
 * Bir randevunun durum değişikliği geçmişi (audit_logs) — owner/manager'ın
 * geriye dönük düzeltmeleri (kim ne zaman hangi durumdan hangi duruma çekti)
 * denetleyebilmesi için. /api/staff/[id]/activity ile aynı kaynağı okur,
 * kayıt yerine tek bir randevuya (record_id) göre filtreler. Personel bu
 * geçmişi göremez.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });
  if (member.role === "staff") return NextResponse.json({ error: "Yetersiz yetki" }, { status: 403 });

  const { data: history } = await supabase
    .from("audit_logs")
    .select("id, created_at, old_data, new_data")
    .eq("org_id", member.org_id)
    .eq("table_name", "appointments")
    .eq("action", "appointment_status_change")
    .eq("record_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({ history: history ?? [] });
}
