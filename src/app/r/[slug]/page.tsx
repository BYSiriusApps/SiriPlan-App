import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PublicBookingClient } from "./PublicBookingClient";

// select("*") kasıtlı: website_* kolonları henüz Supabase'e uygulanmamış bir
// migration'a bağlıysa bile bu sorgu hata vermemeli — org bulunamadı sanılıp
// herkese açık randevu sayfası 404'e düşmemeli. Eksik kolonlar sadece
// undefined döner (falsy), showWebsite hesaplaması güvenle false'a düşer.
async function fetchOrgMeta(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organizations")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return data as {
    name: string;
    website_tagline?: string | null;
    cover_url?: string | null;
    logo_url?: string | null;
    feature_website?: boolean;
    website_enabled?: boolean;
  } | null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const org = await fetchOrgMeta(slug);
  if (!org) return {};

  const showWebsite = !!(org.feature_website && org.website_enabled);
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
