import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTranslations } from "next-intl/server";
import { blogPosts as posts } from "@/lib/blog-posts";
import { buildAlternates } from "@/lib/seo/alternates";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("blogPage");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: await buildAlternates("/blog"),
  };
}

const CATEGORY_COLORS: Record<string, string> = {
  "İpuçları": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "AI & Teknoloji": "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  "Müşteri Yönetimi": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "KVKK & Hukuk": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  "Büyüme": "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  "Ciro": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "Personel Yönetimi": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
};

const POST_IMAGES: Record<string, string> = {
  "randevu-doluluk-orani-artirma": "/blog/randevu-doluluk-orani-artirma.png",
  "whatsapp-ai-asistan-kurulum": "/blog/whatsapp-ai-asistan-kurulum.png",
  "sadakat-programi-musteri-kaybi-onleme": "/blog/sadakat-programi-musteri-kaybi-onleme.png",
  "kvkk-guzellik-salonlari-rehber": "/blog/kvkk-guzellik-salonlari-rehber.png",
  "instagram-otomatik-randevu-kurulum": "/blog/instagram-otomatik-randevu-kurulum.png",
  "kdv-komisyon-raporlama-otomasyonu": "/blog/kdv-komisyon-raporlama-otomasyonu.png",
  "randevu-no-show-azaltma": "/blog/randevu-no-show-azaltma.png",
  "salon-personel-prim-maas-hesaplama": "/blog/salon-personel-prim-maas-hesaplama.png",
  "randevu-bekleme-listesi-bos-saat-doldurma": "/blog/randevu-bekleme-listesi-bos-saat-doldurma.png",
};

export default async function BlogPage() {
  const t = await getTranslations("blogPage");

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="py-16 md:py-24 border-b border-border bg-muted/20">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <PenLine className="w-3.5 h-3.5" />
            {t("badge")}
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            {t("heroTitleLine")}<br />
            <span className="brand-gradient-text">{t("heroTitleHighlight")}</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            {t("heroSubtitle")}
          </p>
        </div>
      </section>

      {/* Posts */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group flex flex-col overflow-hidden bg-card rounded-2xl border border-border hover:border-primary/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                  <Image
                    src={POST_IMAGES[post.slug] ?? "/sectors/guzellik.jpg"}
                    alt={post.title}
                    fill
                    sizes="(min-width: 1024px) 384px, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <span className={`absolute top-3 left-3 text-sm font-semibold px-3 py-1 rounded-full ${CATEGORY_COLORS[post.category] || "bg-muted text-muted-foreground"}`}>
                    {post.category}
                  </span>
                </div>
                <div className="flex flex-col flex-1 p-5">
                  <div className="flex items-center gap-2 mb-3 text-sm font-medium text-foreground/70">
                    <span>{post.date}</span>
                    <span>·</span>
                    <span>{post.readTime} {t("readTimeSuffix")}</span>
                  </div>
                  <h2 className="font-bold text-xl mb-3 group-hover:text-primary transition-colors leading-snug line-clamp-3">
                    {post.title}
                  </h2>
                  <p className="text-base text-foreground/80 leading-relaxed line-clamp-3">
                    {post.excerpt}
                  </p>
                  <span className="mt-auto pt-5 flex items-center gap-1 text-sm text-primary font-semibold group-hover:gap-2 transition-all">
                    {t("readMore")} <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-muted-foreground text-sm mb-4">
              {t("newsletterText")}
            </p>
            <Link href="/auth/kayit">
              <Button className="bg-primary hover:bg-primary/90 gap-2">
                {t("ctaButton")}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
