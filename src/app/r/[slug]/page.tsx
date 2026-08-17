import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { getEntitlements } from "@/lib/entitlements";
import { PublicBookingClient } from "./PublicBookingClient";

// Bu sayfa herkese açıktır (oturum yok). Önceden anon rolüyle sorgulanıyordu;
// anon rolünün organizations tablosuna doğrudan erişimi kaldırıldığı için
// (bkz. 20260817_public_data_lockdown.sql) sunucu tarafında service role ile
// okunur. Kolonlar açıkça sayılır: `select("*")` bu tabloda wa_token /
// sms_password / ig_page_access_token gibi sırları da getirir ve bunların
// sayfa yükünde (RSC payload) istemciye ulaşma riski vardır.
//
// Yeni bir website_* kolonu henüz Supabase'e uygulanmamış olabileceği için
// liste iki parçalı okunur: zorunlu çekirdek alanlar başarısız olursa sayfa
// 404'e düşer, opsiyonel alanlar hata verirse sessizce yok sayılır — herkese
// açık randevu sayfası hiçbir migration gecikmesinde kırılmamalı.
const ORG_META_CORE = "id, slug, name, logo_url, cover_url, plan, subscription_status, trial_ends_at, feature_website";
const ORG_META_OPTIONAL = "website_enabled, website_tagline";

async function fetchOrgMeta(slug: string) {
  const supabase = await createAdminClient();
  let { data } = await supabase
    .from("organizations")
    .select(`${ORG_META_CORE}, ${ORG_META_OPTIONAL}`)
    .eq("slug", slug)
    .maybeSingle();

  if (!data) {
    ({ data } = await supabase
      .from("organizations")
      .select(ORG_META_CORE)
      .eq("slug", slug)
      .maybeSingle());
  }
  return data as {
    name: string;
    website_tagline?: string | null;
    cover_url?: string | null;
    logo_url?: string | null;
    feature_website?: boolean;
    website_enabled?: boolean;
    plan?: string | null;
    trial_ends_at?: string | null;
  } | null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const org = await fetchOrgMeta(slug);
  if (!org) return {};

  // Deneme süresi Pro'ya denk: website modu etkin yetkiden hesaplanır.
  const showWebsite = !!(getEntitlements(org).feature_website && org.website_enabled);
  const title = org.name;
  const description = org.website_tagline || `${org.name} — online randevu al`;
  const image = org.cover_url || org.logo_url || undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: image ? [image] : undefined,
    },
    // Website modu kapalı (Starter plan / henüz açılmamış) sayfalar arama motorlarından
    // gizli kalır; robots.ts artık /r/'ı toptan engellemiyor, granülerlik burada.
    robots: showWebsite ? undefined : { index: false, follow: false },
  };
}

export default async function PublicBookingRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await fetchOrgMeta(slug);

  if (!org) notFound();

  return <PublicBookingClient slug={slug} />;
}
