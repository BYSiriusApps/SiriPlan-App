import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getActiveMember } from "@/lib/active-org";
import { getStripe } from "@/lib/stripe/config";

const CONFIRM_PHRASE = "HESABIMI SİL";

/**
 * Apple 5.1.1(v) / Google Play hesap silme zorunluluğu: yalnızca işletme
 * sahibi (owner) kendi hesabını ve işletmesini uygulama içinden silebilir.
 * Müşteri kayıtları ASLA silinmiyor (bkz. proje kuralı) — bunun yerine
 * kişisel tanımlayıcı alanlar anonimleştirilir, randevu/ciro geçmişi
 * muhasebe mevzuatı gereği toplu istatistik olarak saklanır. Gizlilik
 * politikası s8 bölümü bu davranışı birebir yansıtmalı.
 */
export async function POST(req: NextRequest) {
  const { confirm } = await req.json().catch(() => ({}));
  if (confirm !== CONFIRM_PHRASE) {
    return NextResponse.json({ error: "Onay metni eşleşmiyor" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Önce giriş yapmalısınız" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member || member.role !== "owner") {
    return NextResponse.json(
      { error: "Yalnızca işletme sahibi hesabı silebilir" },
      { status: 403 }
    );
  }

  const orgId = member.org_id;
  const admin = await createAdminClient();

  const { data: org } = await admin
    .from("organizations")
    .select("name, stripe_subscription_id, settings_json")
    .eq("id", orgId)
    .single();

  // Stripe aboneliği varsa iptal et (en iyi çaba — başarısız olursa silme akışını durdurmaz)
  if (org?.stripe_subscription_id) {
    try {
      await getStripe().subscriptions.cancel(org.stripe_subscription_id);
    } catch {
      // abonelik zaten iptal edilmiş/bulunamıyor olabilir — yoksay
    }
  }

  // Müşteri kayıtlarındaki kişisel tanımlayıcıları anonimleştir (kayıtlar silinmiyor)
  await admin
    .from("customers")
    .update({
      full_name: "Silinmiş Müşteri",
      phone: null,
      email: null,
      notes: null,
      tags: [],
    })
    .eq("org_id", orgId);

  // Personel iletişim bilgilerini anonimleştir (isim/rol maaş kayıtları için korunur)
  await admin
    .from("staff")
    .update({
      phone: null,
      email: null,
      avatar_url: null,
      bio: null,
      telegram_chat_id: null,
      whatsapp_number: null,
    })
    .eq("org_id", orgId);

  // İşletme iletişim/entegrasyon bilgilerini temizle, hesabı devre dışı olarak işaretle
  await admin
    .from("organizations")
    .update({
      name: `${org?.name ?? "İşletme"} (Silinmiş Hesap)`,
      phone: null,
      email: null,
      address: null,
      city: null,
      logo_url: null,
      cover_url: null,
      instagram_handle: null,
      whatsapp_number: null,
      location_url: null,
      wa_token: null,
      wa_phone_number_id: null,
      ig_page_access_token: null,
      ig_page_id: null,
      google_calendar_token: null,
      telegram_chat_id: null,
      subscription_status: "cancelled",
      settings_json: {
        ...((org?.settings_json as Record<string, unknown>) ?? {}),
        account_deleted: true,
        account_deleted_at: new Date().toISOString(),
      },
    })
    .eq("id", orgId);

  // Bu işletmenin tüm üyeliklerini kaldır (owner/manager/staff girişleri kapanır)
  await admin.from("org_members").delete().eq("org_id", orgId);

  // Hesap sahibinin giriş bilgilerini tamamen sil
  await admin.auth.admin.deleteUser(user.id);

  return NextResponse.json({ ok: true });
}
