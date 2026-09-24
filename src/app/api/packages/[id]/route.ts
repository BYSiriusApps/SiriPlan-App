import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";

const PatchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  expires_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullish(),
  note: z.string().trim().max(500).nullish(),
  status: z.enum(["active", "completed", "expired", "cancelled"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.expires_at !== undefined) updates.expires_at = parsed.data.expires_at;
  if (parsed.data.note !== undefined) updates.note = parsed.data.note;
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;

  const { data, error } = await supabase
    .from("customer_packages")
    .update(updates)
    .eq("id", id)
    .eq("org_id", member.org_id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Paket bulunamadı" }, { status: 404 });

  return NextResponse.json({
    package: { ...data, remaining_sessions: Number(data.total_sessions) - Number(data.used_sessions) },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  // Yalnızca hiç kullanılmamış paket tamamen silinebilir; kullanılmışsa iptal et.
  const { data: pkg } = await supabase
    .from("customer_packages")
    .select("used_sessions")
    .eq("id", id)
    .eq("org_id", member.org_id)
    .single();
  if (!pkg) return NextResponse.json({ error: "Paket bulunamadı" }, { status: 404 });

  if (Number(pkg.used_sessions) > 0) {
    await supabase
      .from("customer_packages")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("org_id", member.org_id);
    return NextResponse.json({ cancelled: true });
  }

  const { error } = await supabase
    .from("customer_packages")
    .delete()
    .eq("id", id)
    .eq("org_id", member.org_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ deleted: true });
}
