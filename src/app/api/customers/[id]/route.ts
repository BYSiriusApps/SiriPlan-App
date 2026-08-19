import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/permissions";

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

/**
 * DELETE /api/customers/[id] — müşteri kaydını siler.
 *
 * Yetki: işletme sahibi her zaman; diğer üyeler yalnızca `delete_customers`
 * izniyle (yönetici rolünde varsayılan açık, personelde kapalı — Ayarlar >
 * Personel Yetkileri'nden değiştirilebilir).
 *
 * İKİ AYRI DAVRANIŞ — randevu/ciro geçmişi asla kaybolmaz:
 *
 *  • Randevusu OLMAYAN müşteri (yanlış/mükerrer kayıt) → satır tamamen
 *    silinir. Silme butonunun asıl amacı budur.
 *  • Randevusu OLAN müşteri → satır silinmez, KİŞİSEL VERİLERİ TEMİZLENİR
 *    (KVKK "unutulma hakkı"). Randevu satırları tarih/tutar/durum bilgisiyle
 *    muhasebe ve rapor bütünlüğü için kalır; isim ve telefon oralarda da
 *    anonimleştirilir. Böylece takvim, raporlar ve gelir tabloları bozulmaz.
 *    Bu, hesap silme akışındaki (api/account/delete) davranışla aynıdır.
 *
 * Yabancı anahtarların çoğunda ON DELETE tanımlı olmadığı için (appointments,
 * loyalty_redeems, waitlist, campaign_logs, customers.referred_by_customer_id)
 * temizlik service role ile ve org_id kapsamında elle yapılır.
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });
  if (!hasPermission(member, "delete_customers")) {
    return NextResponse.json(
      { error: "Müşteri silme yetkiniz yok — işletme sahibinden isteyin." },
      { status: 403 }
    );
  }

  // Kullanıcının kendi RLS bağlamıyla okunur: başka bir işletmenin müşterisi
  // buradan geçemez. Sonraki adımlar da her sorguda org_id ile sınırlandırılır.
  const { data: customer } = await supabase
    .from("customers")
    .select("id, full_name")
    .eq("id", id)
    .eq("org_id", member.org_id)
    .maybeSingle();

  if (!customer) return NextResponse.json({ error: "Müşteri bulunamadı" }, { status: 404 });

  const orgId = member.org_id;
  const admin = await createAdminClient();

  const { count: appointmentCount } = await admin
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("customer_id", id);

  const anonymizedPhone = `silindi-${id.slice(0, 8)}`;

  async function anonymize() {
    // customers.phone NOT NULL + UNIQUE(org_id, phone) — bu yüzden null yerine
    // kayda özel bir yer tutucu yazılır.
    await admin
      .from("customers")
      .update({
        full_name: "Silinmiş Müşteri",
        phone: anonymizedPhone,
        email: null,
        notes: null,
        tags: [],
        birth_date: null,
        gender: null,
        kvkk_consent: false,
        marketing_consent: false,
        online_booking_blocked: true,
      })
      .eq("id", id)
      .eq("org_id", orgId);

    // Randevulardaki denormalize isim/telefon da temizlenir (NOT NULL kolonlar)
    await admin
      .from("appointments")
      .update({ customer_name: "Silinmiş Müşteri", customer_phone: anonymizedPhone })
      .eq("org_id", orgId)
      .eq("customer_id", id);
  }

  if ((appointmentCount ?? 0) > 0) {
    await anonymize();
    return NextResponse.json({ ok: true, mode: "anonymized" });
  }

  // Randevusu yok → bağlı yan kayıtları temizleyip satırı gerçekten sil.
  await admin.from("waitlist").delete().eq("org_id", orgId).eq("customer_id", id);
  await admin.from("loyalty_redeems").delete().eq("org_id", orgId).eq("customer_id", id);
  await admin.from("campaign_logs").update({ customer_id: null }).eq("customer_id", id);
  await admin
    .from("customers")
    .update({ referred_by_customer_id: null })
    .eq("org_id", orgId)
    .eq("referred_by_customer_id", id);

  const { error: delErr } = await admin
    .from("customers")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId);

  if (delErr) {
    // Beklenmedik bir bağımlılık kaldıysa veri kaybetmek yerine anonimleştir.
    await anonymize();
    return NextResponse.json({ ok: true, mode: "anonymized" });
  }

  return NextResponse.json({ ok: true, mode: "deleted" });
}
