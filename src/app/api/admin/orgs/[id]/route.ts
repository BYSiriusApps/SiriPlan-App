import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/active-org";
import { PLANS } from "@/lib/stripe/config";
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

  // Plan değiştiğinde feature_* kolonlarını da senkronize et — aksi halde
  // (yalnızca plan/quota kolonlarını yazan eski davranışta) admin panelinden
  // "pro" yapılan bir işletme plan='pro' olur ama feature_website vb. false
  // kalmaya devam eder (bu kolonlar sadece Stripe webhook'unda yazılıyordu),
  // panel "Pro Plana Geç" ekranını göstermeye devam eder.
  const updates: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.plan && parsed.data.plan !== "trial") {
    const planConfig = PLANS[parsed.data.plan];
    updates.max_staff = parsed.data.max_staff ?? planConfig.max_staff;
    updates.max_appointments_monthly = parsed.data.max_appointments_monthly ?? planConfig.max_appointments_monthly;
    Object.assign(updates, planConfig.features);
  }

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("organizations")
    .update(updates)
    .eq("id", id)
    .select("id, name, plan, subscription_status, max_staff, max_appointments_monthly, trial_ends_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ organization: data });
}
