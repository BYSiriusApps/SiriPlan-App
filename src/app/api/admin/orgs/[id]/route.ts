import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/active-org";
import { z } from "zod";

const PatchSchema = z.object({
  plan: z.enum(["trial", "starter", "pro", "business"]).optional(),
  subscription_status: z.enum(["active", "past_due", "canceled", "paused"]).optional(),
  max_staff: z.number().int().min(1).max(9999).optional(),
  max_appointments_monthly: z.number().int().min(1).max(999999).optional(),
  trial_ends_at: z.string().datetime().nullable().optional(),
});

// Platform admin: salon planı / kota / abonelik durumu günceller.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  if (!(await isPlatformAdmin(supabase))) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 });
  }

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("organizations")
    .update(parsed.data)
    .eq("id", id)
    .select("id, name, plan, subscription_status, max_staff, max_appointments_monthly, trial_ends_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ organization: data });
}
