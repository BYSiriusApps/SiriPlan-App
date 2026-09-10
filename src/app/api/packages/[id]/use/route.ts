import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";
import { recordPackageUsage, revertPackageUsage } from "@/lib/package-tx";

/**
 * POST /api/packages/[id]/use
 *   body: { revert?: boolean, appointment_id?: string, note?: string }
 *
 * Elle seans düşme / geri alma. Randevu tamamlama akışı bu ucu KULLANMAZ;
 * o `/api/appointments/[id]/complete` içinden recordPackageUsage'ı doğrudan çağırır.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const revert = body?.revert === true;
  const appointmentId = typeof body?.appointment_id === "string" ? body.appointment_id : null;
  const note = typeof body?.note === "string" ? body.note : null;

  const result = revert
    ? await revertPackageUsage(supabase, member.org_id, user.id, { packageId: id, appointmentId, note })
    : await recordPackageUsage(supabase, member.org_id, user.id, { packageId: id, appointmentId, note });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({
    ok: true,
    alreadyUsed: result.alreadyUsed ?? false,
    remaining: result.remaining,
    completed: result.packageCompleted ?? false,
  });
}
