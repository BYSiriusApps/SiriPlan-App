import type { MetadataRoute } from "next";
import { blogPosts } from "@/lib/blog-posts";
import { LOCALES } from "@/lib/i18n/resolve-locale";
import { localizedUrl } from "@/lib/seo/alternates";
import { createAdminClient } from "@/lib/supabase/server";
import { getEntitlements } from "@/lib/entitlements";

const sectorSlugs = [
  "kuafor", "berber", "guzellik", "spa", "nail",
  "estetik", "makyaj", "tattoo", "diyetisyen", "kas",
  "dis-klinigi", "petkuafor",
];

type PriorityEntry = { pathname: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number };

const STATIC_PATHS: PriorityEntry[] = [
  { pathname: "/", changeFrequency: "weekly", priority: 1.0 },
  { pathname: "/ozellikler", changeFrequency: "monthly", priority: 0.9 },
  { pathname: "/fiyatlar", changeFrequency: "weekly", priority: 0.9 },
  { pathname: "/demo", changeFrequency: "monthly", priority: 0.8 },
  { pathname: "/entegrasyonlar", changeFrequency: "monthly", priority: 0.7 },
  { pathname: "/hakkimizda", changeFrequency: "monthly", priority: 0.7 },
  { pathname: "/blog", changeFrequency: "weekly", priority: 0.8 },
  { pathname: "/iletisim", changeFrequency: "monthly", priority: 0.7 },
  { pathname: "/sss", changeFrequency: "monthly", priority: 0.7 },
  { pathname: "/guvenlik", changeFrequency: "monthly", priority: 0.5 },
  { pathname: "/gizlilik", changeFrequency: "yearly", priority: 0.3 },
  { pathname: "/kosullar", changeFrequency: "yearly", priority: 0.3 },
  { pathname: "/kvkk", changeFrequency: "yearly", priority: 0.3 },
  { pathname: "/cerezler", changeFrequency: "yearly", priority: 0.3 },
  { pathname: "/hesap-silme", changeFrequency: "yearly", priority: 0.2 },
];

const SECTOR_PATHS: PriorityEntry[] = sectorSlugs.map((slug) => ({
  pathname: `/kategori/${slug}`,
  changeFrequency: "monthly",
  priority: 0.8,
}));

const BLOG_PATHS: PriorityEntry[] = blogPosts.map((post) => ({
  pathname: `/blog/${post.slug}`,
  changeFrequency: "monthly",
  priority: 0.6,
}));

/**
 * Her sayfanın HER locale'i kendi satırını alır, ve her satır TÜM dil
 * sürümlerini (+ x-default) `alternates.languages` içinde listeler — bu,
 * Google'ın dokümante ettiği sitemap-hreflang deseni (her dil sürümü diğer
 * hepsini bilir, yalnızca kendini değil). URL üretimi `localizedUrl` ile
 * sayfa içi `buildAlternates`'la (bkz. lib/seo/alternates.ts) AYNI
 * fonksiyondan geçiyor — sitemap ile sayfa canonical'ının zamanla
 * birbirinden sapmasını (klasik hreflang hatası) engelliyor.
 */
function expandEntry(entry: PriorityEntry, now: Date): MetadataRoute.Sitemap {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l] = localizedUrl(entry.pathname, l);
  languages["x-default"] = localizedUrl(entry.pathname, "tr");

  return LOCALES.map((locale) => ({
    url: localizedUrl(entry.pathname, locale),
    lastModified: now,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
    alternates: { languages },
  }));
}

/**
 * Web sitesi modunu aktif kılan canlı işletmelerin herkese açık /r/[slug]
 * sayfalarını sitemap'e dinamik olarak ekler.
 */
async function fetchPublicSalonEntries(now: Date): Promise<MetadataRoute.Sitemap> {
  try {
    const supabase = await createAdminClient();
    const { data: orgs } = await supabase
      .from("organizations")
      .select("slug, plan, trial_ends_at, feature_website, website_enabled, updated_at")
      .eq("website_enabled", true);

    if (!orgs || orgs.length === 0) return [];

    return orgs
      .filter((org) => {
        const entitlements = getEntitlements(org as any);
        return entitlements.feature_website;
      })
      .map((org) => ({
        url: `https://siriplan.com/r/${org.slug}`,
        lastModified: org.updated_at ? new Date(org.updated_at) : now,
        changeFrequency: "weekly" as const,
        priority: 0.7,
        alternates: {
          languages: {
            tr: `https://siriplan.com/r/${org.slug}`,
            "x-default": `https://siriplan.com/r/${org.slug}`,
          },
        },
      }));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const allEntries = [...STATIC_PATHS, ...SECTOR_PATHS, ...BLOG_PATHS];
  const staticSitemap = allEntries.flatMap((entry) => expandEntry(entry, now));
  const salonSitemap = await fetchPublicSalonEntries(now);
  return [...staticSitemap, ...salonSitemap];
}
