import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";
import { logAppointmentStatusChange, logAudit } from "@/lib/audit";
import { findEligibleOffers, type EligibleOffer } from "@/lib/campaign-redeem";
import { findActivePackageForService, recordPackageUsage } from "@/lib/package-tx";
import { canChangeAppointmentStatus } from "@/lib/appointment-status";

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
    // Kampanya indirimi: hak kimliği (campaign_logs.id) → uygula; "none" →
    // uygulama; boş → hak varsa işlem yapılmadan 409 OFFER_CHOICE döner ki
    // çalışan hakkı görüp karar versin (sessizce atlanıp hak kaybolmasın).
    apply_campaign_log_id = null,
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
  // iptal/gelmedi bir randevuyu "tamamlandı"ya çekmek de geriye dönük bir
  // düzeltmedir (ciro/sadakat/paket düşümü tetikler) — personele değil,
  // yalnızca owner/manager'a açık.
  if (!canChangeAppointmentStatus(member.role, appt.status, "tamamlandi")) {
    return NextResponse.json(
      { error: "Bu randevu kapatıldığı için (iptal/gelmedi) durumunu yalnızca yönetici veya salon sahibi değiştirebilir." },
      { status: 403 }
    );
  }

  // ── Kampanya indirim hakkı (yalnızca kontrol; henüz hiçbir şey yazılmaz) ──
  // Sorgu hatası/eksik migration → "hak yok" sayılır, tamamlama eskisi gibi sürer.
  const chosenLogId = typeof apply_campaign_log_id === "string" ? apply_campaign_log_id : null;
  let offerChoice: EligibleOffer | null = null;
  if (appt.customer_id && chosenLogId !== "none") {
    const eligible = await findEligibleOffers(supabase, member.org_id, appt, member.organizations?.timezone);
    if (eligible.length > 0 || chosenLogId) {
      // Paketten karşılanacak randevu ücretsiz kapanır — indirim anlamsız, sorulmaz.
      const coveredByPackage =
        !!use_package &&
        !!(
          (typeof use_package_id === "string" && use_package_id) ||
          appt.package_id ||
          (await findActivePackageForService(supabase, member.org_id, appt.customer_id, appt.service_id))
        );
      if (!coveredByPackage) {
        if (!chosenLogId) {
          return NextResponse.json(
            { code: "OFFER_CHOICE", error: "Müşterinin kullanılabilir kampanya indirim hakkı var", offers: eligible },
            { status: 409 }
          );
        }
        offerChoice = eligible.find((o) => o.log_id === chosenLogId) ?? null;
        if (!offerChoice) {
          return NextResponse.json(
            { code: "OFFER_INVALID", error: "Seçilen indirim hakkı artık geçerli değil (kullanılmış ya da süresi dolmuş)" },
            { status: 409 }
          );
        }
      }
    }
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

  const effectivePayment = usedPackage ? "paket" : payment_method;

  // Kampanya hakkını ATOMİK olarak ayır: aynı hak iki eşzamanlı tamamlamada
  // ikinci kez kullanılamaz (redeemed_at IS NULL koşulu). Ayırma başarısızsa
  // hiçbir değişiklik yapılmadan çıkılır.
  if (usedPackage) offerChoice = null;
  let claimedLogId: string | null = null;
  if (offerChoice) {
    const { data: claim } = await supabase
      .from("campaign_logs")
      .update({ redeemed_at: new Date().toISOString(), redeemed_appointment_id: id })
      .eq("id", offerChoice.log_id)
      .is("redeemed_at", null)
      .select("id");
    if (!claim || claim.length === 0) {
      return NextResponse.json(
        { code: "OFFER_INVALID", error: "Bu indirim hakkı az önce başka bir işlemde kullanılmış" },
        { status: 409 }
      );
    }
    claimedLogId = offerChoice.log_id;
  }

  // Mark complete — indirim uygulandıysa fiyat İNDİRİMLİ yazılır; gelir satırı,
  // müşteri cirosu ve raporlar (DB tetikleyicisi NEW.price kullanır) otomatik
  // gerçekten ödenen tutarı yansıtır.
  const { error: updateErr } = await supabase
    .from("appointments")
    .update({
      status: "tamamlandi",
      tip: tip || 0,
      payment_method: effectivePayment,
      ...(usedPackage ? { price: 0 } : {}),
      ...(offerChoice
        ? { price: offerChoice.final_price, discount_amount: offerChoice.discount_amount, campaign_log_id: offerChoice.log_id }
        : {}),
    })
    .eq("id", id);

  if (updateErr) {
    // Tamamlama yazılamadıysa ayrılan hakkı geri bırak — hak kaybolmasın.
    if (claimedLogId) {
      await supabase
        .from("campaign_logs")
        .update({ redeemed_at: null, redeemed_appointment_id: null })
        .eq("id", claimedLogId);
    }
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  if (offerChoice) {
    logAudit({
      orgId: member.org_id,
      userId: user.id,
      action: "campaign_offer_redeem",
      tableName: "appointments",
      recordId: id,
      details: {
        campaign_id: offerChoice.campaign_id,
        campaign_log_id: offerChoice.log_id,
        discount_amount: offerChoice.discount_amount,
        final_price: offerChoice.final_price,
        role: member.role,
      },
      req,
    }).catch(() => {});
  }

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

  // Müşteri istatistikleri (visit_count, total_spend += fiyat, last_visit_at,
  // paketten karşılanan randevuda fiyat 0 → ciroya 0 katkı ama ziyaret sayılır)
  // DB trigger'ı `trg_appointment_completion` (012_appointment_completion_triggers.sql)
  // tarafından status "tamamlandi"ya geçerken YAZILIR. Burada tekrar artırmak
  // her tamamlamada ziyareti ve cirosu ikişer kez sayıyordu. Trigger'ın hiç
  // yazmadığı tek şey bahşiş olduğu için yalnızca onu ekliyoruz.
  const tipAmount = Number(tip || 0);
  if (appt.customer_id && tipAmount > 0) {
    const { data: cust } = await supabase
      .from("customers")
      .select("total_spend")
      .eq("id", appt.customer_id)
      .eq("org_id", member.org_id)
      .single();

    if (cust) {
      await supabase
        .from("customers")
        .update({ total_spend: Number(cust.total_spend || 0) + tipAmount })
        .eq("id", appt.customer_id)
        .eq("org_id", member.org_id);
    }
  }

  return NextResponse.json({
    success: true,
    usedPackage,
    discount: offerChoice
      ? { amount: offerChoice.discount_amount, final_price: offerChoice.final_price, campaign: offerChoice.campaign_name }
      : null,
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
