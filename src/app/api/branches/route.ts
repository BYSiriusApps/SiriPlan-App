import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isMobileApp } from "@/lib/mobile-app";
import { seedDefaultServices } from "@/lib/services/seed";
import { getOrgAddons } from "@/lib/stripe/addons";
import { isBranchOrg } from "@/lib/branches";

export const dynamic = "force-dynamic";

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[çÇ]/g, "c").replace(/[ğĞ]/g, "g")
    .replace(/[ıİiİ]/g, "i").replace(/[öÖ]/g, "o")
    .replace(/[şŞ]/g, "s").replace(/[üÜ]/g, "u")
    .replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-")
    .replace(/^-|-$/g, "").slice(0, 35);
}

/**
 * Satın alınmış Ek Şube hakkıyla yeni şube (= ayrı organizasyon) açar.
 *
 * - Yalnızca ana işletmenin SAHİBİ ve yalnızca web'den (native uygulamada
 *   satın alma sonrası kullanım yüzeyi de açılmaz; mağaza kuralları).
 * - Hak kontrolü atomiktir (claim_branch_slot): hak sayısı aşılamaz.
 * - Şube, ana işletmenin planını/özelliklerini miras alır; kendi Stripe
 *   aboneliği yoktur (bkz. lib/branches.ts). Veri izolasyonu aynen sürer:
 *   şube ayrı org_id'dir.
 */
export async function POST(req: NextRequest) {
  if (await isMobileApp()) {
    return NextResponse.json(
      { error: "Bu işlem mobil uygulama içinden yapılamaz. Lütfen web'den devam edin." },
      { status: 403 }
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member || !member.organizations) return NextResponse.json({ error: "No organization" }, { status: 404 });
  if (member.role !== "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { name?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (name.length < 2 || name.length > 60) {
    return NextResponse.json({ error: "Şube adı 2-60 karakter olmalı." }, { status: 400 });
  }

  const parentId = member.org_id;
  if (await isBranchOrg(parentId)) {
    return NextResponse.json({ error: "Bir şubeden yeni şube açılamaz." }, { status: 409 });
  }

  // Hızlı ön kontrol (kesin kontrol claim_branch_slot'ta, atomik).
  const addons = await getOrgAddons(parentId);
  if (addons.extra_branch_slots <= 0) {
    return NextResponse.json({ error: "Ek şube hakkınız yok.", code: "NO_BRANCH_SLOT" }, { status: 409 });
  }

  const admin = await createAdminClient();
  const { data: parent } = await admin
    .from("organizations")
    .select(
      "type, phone, email, locale, timezone, kdv_enabled, kdv_rate, plan, subscription_status, trial_ends_at, max_staff, max_appointments_monthly, feature_ai, feature_campaigns, feature_gamification, feature_api, feature_whitelabel, feature_website"
    )
    .eq("id", parentId)
    .single();
  if (!parent) return NextResponse.json({ error: "No organization" }, { status: 404 });

  const slug = slugify(name) + "-" + Math.random().toString(36).slice(2, 6);
  const { data: branch, error: orgErr } = await admin
    .from("organizations")
    .insert({
      slug,
      name,
      type: parent.type,
      phone: parent.phone,
      email: parent.email,
      locale: parent.locale,
      timezone: parent.timezone,
      kdv_enabled: parent.kdv_enabled,
      kdv_rate: parent.kdv_rate,
      // Plan alanları ana işletmeden (stripe_* kimlikleri KOPYALANMAZ).
      plan: parent.plan,
      subscription_status: parent.subscription_status,
      trial_ends_at: parent.trial_ends_at,
      max_staff: parent.max_staff,
      max_appointments_monthly: parent.max_appointments_monthly,
      feature_ai: parent.feature_ai,
      feature_campaigns: parent.feature_campaigns,
      feature_gamification: parent.feature_gamification,
      feature_api: parent.feature_api,
      feature_whitelabel: parent.feature_whitelabel,
      feature_website: parent.feature_website,
      has_auto_booking: false,
      wa_reminder_offsets_hours: [2, 24],
      settings_json: { booking_slot_minutes: 30 },
    })
    .select("id")
    .single();
  if (orgErr || !branch) {
    return NextResponse.json({ error: "Şube oluşturulamadı." }, { status: 500 });
  }

  // Hak talebi: başarısızsa az önce açılan boş org geri alınır.
  const { data: claimed, error: claimErr } = await admin.rpc("claim_branch_slot", {
    p_parent: parentId,
    p_branch: branch.id,
  });
  if (claimErr || claimed !== true) {
    await admin.from("organizations").delete().eq("id", branch.id);
    if (claimErr) return NextResponse.json({ error: "Şube oluşturulamadı." }, { status: 500 });
    return NextResponse.json({ error: "Tüm ek şube haklarınızı kullandınız.", code: "NO_BRANCH_SLOT" }, { status: 409 });
  }

  // KVKK onayı ana işletmedeki üyelikten taşınır (aynı kişi, aynı onay).
  const { data: parentMember } = await admin
    .from("org_members")
    .select("kvkk_consent, kvkk_consent_at, marketing_consent, marketing_consent_at")
    .eq("org_id", parentId)
    .eq("user_id", user.id)
    .maybeSingle();

  const { error: memberErr } = await admin.from("org_members").insert({
    org_id: branch.id,
    user_id: user.id,
    role: "owner",
    kvkk_consent: parentMember?.kvkk_consent ?? true,
    kvkk_consent_at: parentMember?.kvkk_consent_at ?? new Date().toISOString(),
    marketing_consent: parentMember?.marketing_consent ?? false,
    marketing_consent_at: parentMember?.marketing_consent_at ?? null,
  });
  if (memberErr) {
    // Üyeliksiz şube kimseye görünmez; geri al (org silinince şube bağlantısı da düşer → hak serbest kalır).
    await admin.from("organizations").delete().eq("id", branch.id);
    return NextResponse.json({ error: "Şube oluşturulamadı." }, { status: 500 });
  }

  const ownerName =
    (user.user_metadata as { full_name?: string } | undefined)?.full_name?.trim() || user.email || "Salon Sahibi";
  await admin.from("staff").insert({ org_id: branch.id, full_name: ownerName, role: "Salon Sahibi", is_active: true });

  try {
    await seedDefaultServices(admin, branch.id, parent.type, parent.locale);
  } catch {
    // Hizmet listesi doldurulamadıysa şube yine kullanılabilir; sahip Hizmetler'den ekler.
  }

  try {
    await admin.from("audit_logs").insert({
      org_id: parentId,
      action: "branch.created",
      table_name: "organizations",
      new_data: { branch_org_id: branch.id, name, user_id: user.id },
    });
  } catch {
    // denetim kaydı akışı engellemez
  }

  return NextResponse.json({ success: true, org_id: branch.id });
}
