import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

const ALLOWED = ["online_booking_blocked", "preferred_language", "birth_date"];

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  const updates: Record<string, unknown> = {};
  for (const key of ALLOWED) {
    if (key in body) updates[key] = body[key];
  }
  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "Güncellenecek alan yok" }, { status: 400 });
  }
  if (
    "preferred_language" in updates &&
    updates.preferred_language !== null &&
    !["tr", "en", "ru", "ar"].includes(updates.preferred_language as string)
  ) {
    return NextResponse.json({ error: "Geçersiz dil" }, { status: 400 });
  }
  if (
    "birth_date" in updates &&
    updates.birth_date !== null &&
    !/^\d{4}-\d{2}-\d{2}$/.test(updates.birth_date as string)
  ) {
    return NextResponse.json({ error: "Geçersiz doğum tarihi" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("customers")
    .update(updates)
    .eq("id", id)
    .eq("org_id", member.org_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  return NextResponse.json({ customer: data });
}
