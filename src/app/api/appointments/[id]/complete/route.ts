import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";
import { logAppointmentStatusChange } from "@/lib/audit";
import { findActivePackageForService, recordPackageUsage } from "@/lib/package-tx";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const {
    tip = 0,
    payment_method = "nakit",
    extra_income = 0,
    // Paketten seans düş: true ise randevunun kayıtlı package_id'si ya da
    // hizmete uyan aktif paket kullanılır. Belirli bir paket dayatmak için
    // use_package_id gönderilebilir. false → paket hiç kullanılmaz.
    use_package = true,
    use_package_id = null,
  } = await req.json();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  // Fetch appointment + service
  const { data: appt, error: fetchErr } = await supabase
    .from("appointments")
    .select("*, service:services(contributes_loyalty, price)")
    .eq("id", id)
    .eq("org_id", member.org_id)
    .single();

  if (fetchErr || !appt) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  if (appt.status === "tamamlandi") {
    return NextResponse.json({ error: "Zaten tamamlandı" }, { status: 400 });
  }
  if (member.role === "staff" && appt.staff_id !== member.staff_id) {
    return NextResponse.json({ error: "Bu randevu size atanmadığı için işlem yapamazsınız" }, { status: 403 });
  }

  // ── Paket eşleştirme ──────────────────────────────────────────
  // Randevu bir pakete bağlıysa (booking sırasında seçildi) ya da müşterinin bu
  // hizmet için aktif paketi varsa, tamamlanınca bir seans düşülür ve randevu
  // ücretsiz (price = 0, payment_method = 'paket') olarak kapanır. Böylece aylık
  // ciro paket satışıyla iki kez saymaz.
  let packageResult: Awaited<ReturnType<typeof recordPackageUsage>> | null = null;
  let usedPackage = false;
  if (use_package && appt.customer_id) {
    let targetPackageId: string | null =
      (typeof use_package_id === "string" && use_package_id) ||
      (appt.package_id as string | null) ||
      null;

    if (!targetPackageId) {
      const match = await findActivePackageForService(
        supabase,
        member.org_id,
        appt.customer_id,
        appt.service_id,
      );
      targetPackageId = match?.id ?? null;
    }

    if (targetPackageId) {
      packageResult = await recordPackageUsage(supabase, member.org_id, user.id, {
        packageId: targetPackageId,
        appointmentId: id,
        note: "Randevu tamamlandı",
      });
      // alreadyUsed de "paketten karşılandı" sayılır (çift tamamlama).
      usedPackage = packageResult.ok;
      if (packageResult.ok && !(appt.package_id === targetPackageId)) {
        await supabase.from("appointments").update({ package_id: targetPackageId }).eq("id", id);
      }
    }
  }

  const effectivePrice = usedPackage ? 0 : Number(appt.price);
  const effectivePayment = usedPackage ? "paket" : payment_method;

  // Mark complete
  const { error: updateErr } = await supabase
    .from("appointments")
    .update({
      status: "tamamlandi",
      tip: tip || 0,
      payment_method: effectivePayment,
      ...(usedPackage ? { price: 0 } : {}),
    })
    .eq("id", id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  const extraIncomeAmount = Number(extra_income) || 0;
  if (extraIncomeAmount > 0) {
    await supabase.from("expenses").insert({
      org_id: member.org_id,
      type: "gelir",
      category: "randevu",
      amount: extraIncomeAmount,
      description: `${appt.customer_name} — ekstra gelir (randevu)`,
      date: new Date().toISOString().slice(0, 10),
      payment_method,
      created_by: user.id,
    });
  }

  logAppointmentStatusChange({
    orgId: member.org_id,
    userId: user.id,
    actorName: (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "Bilinmiyor",
    appointmentId: id,
    staffId: appt.staff_id,
    customerName: appt.customer_name,
    appointmentAt: appt.appointment_at,
    oldStatus: appt.status,
    newStatus: "tamamlandi",
  }).catch(() => {});

  // Add loyalty punch if applicable
  if (appt.customer_id && appt.service?.contributes_loyalty && !appt.loyalty_punch_added) {
    await supabase
      .from("customers")
      .update({ loyalty_punches: supabase.rpc("increment", { x: 1 }) })
      .eq("id", appt.customer_id);

    await supabase
      .from("appointments")
      .update({ loyalty_punch_added: true })
      .eq("id", id);
  }

  // Update customer stats — paketten karşılanan randevu ciroya 0 katkı verir
  // ama ziyaret sayılır.
  if (appt.customer_id) {
    const totalEarned = effectivePrice + Number(tip || 0);
    const { data: cust } = await supabase
      .from("customers")
      .select("visit_count, total_spend")
      .eq("id", appt.customer_id)
      .single();

    if (cust) {
      await supabase
        .from("customers")
        .update({
          visit_count: (cust.visit_count || 0) + 1,
          total_spend: Number(cust.total_spend || 0) + totalEarned,
          last_visit_at: new Date().toISOString(),
        })
        .eq("id", appt.customer_id);
    }
  }

  return NextResponse.json({
    success: true,
    usedPackage,
    package: usedPackage
      ? {
          name: packageResult?.packageName,
          remaining: packageResult?.remaining,
          alreadyUsed: packageResult?.alreadyUsed ?? false,
          completed: packageResult?.packageCompleted ?? false,
        }
      : null,
  });
}
