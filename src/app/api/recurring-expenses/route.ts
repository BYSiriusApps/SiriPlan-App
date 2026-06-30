import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function getOrgId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from("org_members").select("org_id").eq("user_id", userId).single();
  return data?.org_id ?? null;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(supabase, user.id);
  if (!orgId) return NextResponse.json({ error: "No org" }, { status: 403 });

  const { data, error } = await supabase
    .from("recurring_expenses")
    .select("*")
    .eq("org_id", orgId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(supabase, user.id);
  if (!orgId) return NextResponse.json({ error: "No org" }, { status: 403 });

  const body = await req.json();

  // Apply action: create actual expenses from all active templates for a given month
  if (body.action === "apply") {
    const { year, month } = body;
    if (!year || !month) return NextResponse.json({ error: "year/month gerekli" }, { status: 400 });

    const { data: templates, error: tErr } = await supabase
      .from("recurring_expenses")
      .select("*")
      .eq("org_id", orgId)
      .eq("is_active", true);

    if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });
    if (!templates || templates.length === 0) {
      return NextResponse.json({ inserted: 0, message: "Aktif şablon yok" });
    }

    const applyDate = `${year}-${String(month).padStart(2, "0")}-01`;

    const rows = templates.map((t) => ({
      org_id: orgId,
      type: t.type,
      category: t.category,
      amount: t.amount,
      description: t.description,
      payment_method: t.payment_method,
      note: t.note,
      date: applyDate,
      created_by: user.id,
    }));

    const { data: inserted, error: iErr } = await supabase
      .from("expenses")
      .insert(rows)
      .select();

    if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });
    return NextResponse.json({ inserted: inserted?.length ?? 0 });
  }

  // Create a new template
  const { type, category, amount, description, payment_method, note, sort_order } = body;
  if (!type || !category || !amount || !description) {
    return NextResponse.json({ error: "Eksik alan" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("recurring_expenses")
    .insert({
      org_id: orgId,
      type,
      category,
      amount: Number(amount),
      description,
      payment_method: payment_method ?? "nakit",
      note,
      sort_order: sort_order ?? 0,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(supabase, user.id);
  if (!orgId) return NextResponse.json({ error: "No org" }, { status: 403 });

  const body = await req.json();
  const { id, type, category, amount, description, payment_method, note, is_active } = body;
  if (!id) return NextResponse.json({ error: "ID gerekli" }, { status: 400 });

  const { data, error } = await supabase
    .from("recurring_expenses")
    .update({
      type,
      category,
      amount: amount !== undefined ? Number(amount) : undefined,
      description,
      payment_method,
      note,
      is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("org_id", orgId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(supabase, user.id);
  if (!orgId) return NextResponse.json({ error: "No org" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID gerekli" }, { status: 400 });

  const { error } = await supabase
    .from("recurring_expenses")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
