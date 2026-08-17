import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { limitByIp, tooManyRequests } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Herkese açık randevu sayfasının (/r/[slug]) TÜM salon verisini aldığı tek uç.
 *
 * NEDEN VAR: Önceden bu veriyi tarayıcı doğrudan Supabase'den
 * `organizations.select("*")` ile çekiyordu. `organizations` tablosunda
 * wa_token, ig_page_access_token, sms_password, stripe_customer_id gibi
 * ENTEGRASYON SIRLARI duruyor — yani her randevu sayfası ziyaretinde salonun
 * WhatsApp erişim jetonu ağ yanıtında müşteriye gönderiliyordu. Aynı şekilde
 * `staff.select("*")` personelin telefonu, e-postası, prim oranı ve maaşını
 * dışarı veriyordu.
 *
 * Buradaki kolon listeleri BEYAZ LİSTEDİR: yeni bir kolon eklendiğinde
 * (örn. yeni bir API anahtarı) otomatik olarak dışarı sızmaz, birinin bilinçli
 * olarak bu listeye eklemesi gerekir. Tabloya `*` ile erişim bir daha asla
 * istemciye açılmamalı.
 */

// Randevu sayfasının gerçekten kullandığı, herkese açık olması sakıncasız alanlar.
const ORG_PUBLIC_COLUMNS = [
  "id", "slug", "name", "type", "locale", "timezone",
  "phone", "city", "address", "logo_url", "cover_url",
  "instagram_handle", "tiktok_handle", "location_url", "google_review_url",
  "working_hours_json", "kvkk_notice_text",
  "website_enabled", "website_palette", "website_tagline",
  // Yetki/kilit hesapları istemcide yapılıyor (getEntitlements / getSubscriptionLock)
  "plan", "subscription_status", "trial_ends_at", "feature_website",
].join(", ");

const SERVICE_PUBLIC_COLUMNS = [
  "id", "org_id", "name", "description", "duration_minutes", "price", "currency",
  "category_tag", "category_id", "photo_url", "is_active", "is_bookable_online", "display_order",
].join(", ");

// DİKKAT: phone / email / commission_rate / base_salary KASITLI olarak yok.
const STAFF_PUBLIC_COLUMNS = [
  "id", "org_id", "full_name", "role", "bio", "avatar_url",
  "is_active", "working_days", "start_time", "end_time", "display_order",
].join(", ");

export async function GET(req: NextRequest) {
  // Salon kataloğunu kazımaya çalışan botlara karşı makul bir tavan; gerçek bir
  // ziyaretçi sayfa başına 1-2 istek yapar.
  const limit = limitByIp(req, "public-salon", 60, 60_000);
  if (!limit.ok) return tooManyRequests(limit) as unknown as NextResponse;

  const slug = req.nextUrl.searchParams.get("slug")?.trim();
  if (!slug || slug.length > 80) {
    return NextResponse.json({ error: "Geçersiz salon adresi." }, { status: 400 });
  }

  // Service role kullanılıyor: anon rolünün bu tablolara doğrudan erişimi
  // (bkz. 20260817_public_data_lockdown.sql) kaldırıldı, tüm herkese açık
  // okuma buradan, kolon beyaz listesiyle geçiyor.
  const supabase = await createAdminClient();

  const { data: org } = await supabase
    .from("organizations")
    .select(ORG_PUBLIC_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (!org) {
    return NextResponse.json({ error: "Salon bulunamadı." }, { status: 404 });
  }

  // Kolon listesi runtime'da string olarak kurulduğu için supabase-js dönüş
  // tipini çıkaramıyor; erişim öncesi unknown'a düşürülüyor.
  const orgId = (org as unknown as { id: string }).id;

  const [{ data: services }, { data: staff }, { data: staffServices }, { data: categories }] =
    await Promise.all([
      supabase
        .from("services")
        .select(SERVICE_PUBLIC_COLUMNS)
        .eq("org_id", orgId)
        .eq("is_active", true),
      supabase
        .from("staff")
        .select(STAFF_PUBLIC_COLUMNS)
        .eq("org_id", orgId)
        .eq("is_active", true),
      supabase
        .from("staff_services")
        .select("staff_id, service_id"),
      // service_categories tablosu henüz uygulanmamış bir migration'a bağlıysa
      // bu sorgu hata verir — ana randevu akışı bundan etkilenmemeli, kategoriler
      // sessizce boş listeye düşer (önceki istemci davranışıyla aynı).
      supabase
        .from("service_categories")
        .select("id, org_id, name, color, photo_url, display_order, service_category_photos(id, url, display_order)")
        .eq("org_id", orgId),
    ]);

  // staff_services'te org filtresi yok (tabloda org_id kolonu yok) — bu salonun
  // personeline ait satırlara indirgenir.
  const staffIds = new Set((staff ?? []).map((s) => (s as unknown as { id: string }).id));
  const scopedStaffServices = (staffServices ?? []).filter((row) =>
    staffIds.has((row as { staff_id: string }).staff_id)
  );

  return NextResponse.json(
    {
      org,
      services: services ?? [],
      staff: staff ?? [],
      staff_services: scopedStaffServices,
      categories: categories ?? [],
    },
    {
      // Salon bilgisi sık değişmez; kısa süreli CDN önbelleği hem sayfayı
      // hızlandırır hem de kazıma denemelerinin veritabanına inmesini engeller.
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    }
  );
}
