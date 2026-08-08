import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const CreateSchema = z.object({
  customer_name: z.string().min(2).max(100),
  customer_phone: z.string().min(10).max(20),
  service_id: z.string().uuid().optional(),
  staff_id: z.string().uuid().optional(),
  preferred_dates: z.array(z.string()).optional().default([]),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  const status = searchParams.get("status");

  let query = supabase
    .from("waitlist")
    .select("*, service:services(name), staff:staff!waitlist_staff_id_fkey(full_name)")
    .eq("org_id", member.org_id)
    .order("requested_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ waitlist: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstError = Object.entries(fieldErrors).map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`).join("; ");
    return NextResponse.json({ error: firstError || "Geçersiz form verisi" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  const { data, error } = await supabase
    .from("waitlist")
    .insert({
      org_id: member.org_id,
      customer_name: parsed.data.customer_name,
      customer_phone: parsed.data.customer_phone,
      service_id: parsed.data.service_id || null,
      staff_id: parsed.data.staff_id || null,
      preferred_dates: parsed.data.preferred_dates,
      status: "waiting",
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entry: data }, { status: 201 });
}
