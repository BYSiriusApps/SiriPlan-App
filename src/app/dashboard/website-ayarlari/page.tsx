import { createClient } from "@/lib/supabase/server";
import { getActiveMember } from "@/lib/active-org";
import { getEntitlements } from "@/lib/entitlements";
import { isMobileApp } from "@/lib/mobile-app";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Globe } from "lucide-react";
import { HomeButton } from "@/components/dashboard/HomeButton";
import type { Organization, Service, ServiceCategory } from "@/types/database";
import { WebsiteAyarlariClient } from "./WebsiteAyarlariClient";

export default async function WebsiteAyarlariPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/giris");

  const member = await getActiveMember(supabase);
  if (!member) redirect("/auth/kayit");

  // Migration'lar elle uygulandığı için kod, kolondan önce canlıya çıkabilir:
  // eksik kolon isteyen select tüm satırı düşürür ve ayar sayfası boş açılırdı.
  // Yeni kolonlar ayrı denenir, yoksa sessizce eski liste ile devam edilir.
  const ORG_COLUMNS =
    "id, slug, feature_website, website_enabled, website_palette, google_review_url, website_tagline, address, location_url, logo_url, cover_url";

  let { data: org } = await supabase
    .from("organizations")
    .select(`${ORG_COLUMNS}, website_layout`)
    .eq("id", member.org_id)
    .maybeSingle();

  if (!org) {
    ({ data: org } = await supabase
      .from("organizations")
      .select(ORG_COLUMNS)
      .eq("id", member.org_id)
      .maybeSingle());
  }

  // Deneme süresi Pro'ya denk olduğundan feature_website kolonu değil, etkin
  // yetki (plan + trial_ends_at'ten hesaplanan) baz alınır.
  const websiteEntitled = getEntitlements(member.organizations).feature_website;
  if (!websiteEntitled) {
    const mobileApp = await isMobileApp();
    return (
      <div className="p-6 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 text-primary shrink-0">
            <Globe className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold brand-gradient-text">Website Ayarları</h1>
          <HomeButton />
        </div>
        <div className="text-center py-16">
          <Globe className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
          <h2 className="text-xl font-bold mb-2">Randevu Linkinizi Web Sitesine Dönüştürün</h2>
          <p className="text-muted-foreground mb-6">
            Renk paleti, kapak fotoğrafı, hizmet kategorileri ve fotoğraflarla donatılmış, satış artırıcı bir
            işletme sayfası — mevcut randevu linkinizde, ek bir adres olmadan.
          </p>
          {/* Native uygulamada (App Store/Play Store) mağaza kuralları gereği
              plan yükseltme çağrısı gösterilmez; yalnızca durum bilgisi verilir. */}
          {mobileApp ? (
            <p className="text-sm text-muted-foreground">Bu modül mevcut planınıza dahil değil.</p>
          ) : (
            <Link
              href="/dashboard/abonelik"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              Pro Plana Geç →
            </Link>
          )}
        </div>
      </div>
    );
  }

  const [{ data: categories }, { data: services }] = await Promise.all([
    supabase.from("service_categories").select("*, service_category_photos(*)").eq("org_id", member.org_id).order("display_order"),
    supabase.from("services").select("*").eq("org_id", member.org_id).order("display_order"),
  ]);

  return (
    <WebsiteAyarlariClient
      org={org as unknown as Organization}
      initialCategories={(categories || []) as ServiceCategory[]}
      initialServices={(services || []) as Service[]}
    />
  );
}
