import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { direction } = await req.json();
  if (direction !== "up" && direction !== "down") {
    return NextResponse.json({ error: "Geçersiz yön" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });
  if (member.role === "staff") return NextResponse.json({ error: "Yetersiz yetki" }, { status: 403 });

  const { data: rows } = await supabase
    .from("service_categories")
    .select("id, display_order")
    .eq("org_id", member.org_id)
    .order("display_order", { ascending: true });

  const list = rows || [];
  const idx = list.findIndex((r) => r.id === id);
  const targetIdx = direction === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || targetIdx < 0 || targetIdx >= list.length) {
    return NextResponse.json({ ok: true, unchanged: true });
  }

  const current = list[idx];
  const target = list[targetIdx];
  const [err1, err2] = await Promise.all([
    supabase.from("service_categories").update({ display_order: target.display_order }).eq("id", current.id).eq("org_id", member.org_id),
    supabase.from("service_categories").update({ display_order: current.display_order }).eq("id", target.id).eq("org_id", member.org_id),
  ]).then((results) => results.map((r) => r.error));

  if (err1 || err2) return NextResponse.json({ error: (err1 || err2)!.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
