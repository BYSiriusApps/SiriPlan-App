import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";
import { isValidTaxNumber, normalizeTaxNumber, TAX_NUMBER_ERROR } from "@/lib/tax-number";
import { hasPermission } from "@/lib/permissions";

// 'staff' rolünün randevu formu, bekleme listesi, stok gibi kendi erişebildiği
// sayfalarda ihtiyaç duyduğu alanlar. Bunun dışında kalan HER ŞEY —
// wa_token, ig_page_access_token, google_calendar_token, sms_provider/
// username/password, stripe_customer_id/subscription_id, telegram_chat_id,
// tax_number, signup_ip, wa_template_styles/wa_reminder_offsets_hours,
// custom_reminder_message/custom_cancellation_message, max_staff/
// max_appointments_monthly — entegrasyon sırları ya da idari veridir, yalnızca
// owner/manager'a açık kalır (fail-closed: yeni bir kolon eklendiğinde
// otomatik olarak staff'a sızmaz, bilinçli olarak bu listeye eklenmesi gerekir).
// `settings_json` güvenlidir: içinde yalnızca currency, booking_slot_minutes,
// wa_*_template, staff_phone_access, notify_channel_* gibi UI tercihleri
// tutulur — sırlar hep kendi ayrı kolonlarındadır (bkz. src/lib/notify.ts).
const STAFF_SAFE_ORG_COLUMNS = [
  "id", "slug", "name", "type", "locale",
  "phone", "email", "address", "city", "logo_url", "cover_url",
  "instagram_handle", "whatsapp_number", "tiktok_handle", "facebook_handle", "linkedin_handle",
  "google_review_url", "location_url", "working_hours_json", "timezone",
  "plan", "subscription_status", "trial_ends_at",
  "feature_website", "feature_ai", "feature_campaigns", "feature_gamification", "feature_api", "feature_whitelabel",
  "website_enabled", "website_palette", "website_tagline", "website_layout",
  "kdv_enabled", "kdv_rate", "kvkk_notice_text",
  "settings_json",
].join(", ");

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  // Rol 'staff' olsa bile sahip/yönetici o üyeye açıkça 'manage_settings'
  // yetkisi devretmiş olabilir (bkz. proxy.ts — /dashboard/ayarlar sayfası
  // aynı izne bakar). Ham rol yerine izin kontrolü, bu devri de doğru şekilde
  // kapsar.
  const canViewFull = hasPermission(member, "manage_settings");
  const { data: org, error } = await supabase
    .from("organizations")
    .select(canViewFull ? "*" : STAFF_SAFE_ORG_COLUMNS)
    .eq("id", member.org_id)
    .single();

  if (error || !org) return NextResponse.json({ error: "Org bulunamadı" }, { status: 404 });
  return NextResponse.json({ org, role: member.role });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });
  // manage_settings sahip/yönetici tarafından 'staff' rolüne de devredilebilir
  // (bkz. GET yukarıda ve proxy.ts'teki /dashboard/ayarlar sayfa kontrolü).
  if (!hasPermission(member, "manage_settings")) {
    return NextResponse.json({ error: "Yetersiz yetki" }, { status: 403 });
  }

  const ALLOWED = [
    "name", "type", "phone", "email", "address", "city", "tax_number",
    "instagram_handle", "whatsapp_number", "working_hours_json", "locale", "settings_json",
  ];
  const updates: Record<string, unknown> = {};
  for (const key of ALLOWED) {
    if (key in body) updates[key] = body[key];
  }

  if ("tax_number" in updates) {
    const digits = normalizeTaxNumber(updates.tax_number);
    if (!isValidTaxNumber(digits)) {
      return NextResponse.json({ error: TAX_NUMBER_ERROR }, { status: 400 });
    }
    updates.tax_number = digits || null;
  }

  const { data, error } = await supabase
    .from("organizations")
    .update(updates)
    .eq("id", member.org_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ org: data });
}
