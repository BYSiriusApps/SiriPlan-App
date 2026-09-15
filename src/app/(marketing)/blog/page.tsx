import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTranslations } from "next-intl/server";
import { blogPosts as posts } from "@/lib/blog-posts";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("blogPage");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

const CATEGORY_COLORS: Record<string, string> = {
  "İpuçları": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "AI & Teknoloji": "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  "Müşteri Yönetimi": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "KVKK & Hukuk": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  "Büyüme": "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  "Ciro": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
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
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="grid gap-8">
            {posts.map((post) => (
              <Link
                key={post.title}
                href={`/blog/${post.slug}`}
                className="group flex flex-col sm:flex-row gap-6 p-6 bg-card rounded-2xl border border-border hover:border-primary/30 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${CATEGORY_COLORS[post.category] || "bg-muted text-muted-foreground"}`}>
                      {post.category}
                    </span>
                    <span className="text-xs text-muted-foreground">{post.date}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{post.readTime} {t("readTimeSuffix")}</span>
                  </div>
                  <h2 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors leading-snug">
                    {post.title}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {post.excerpt}
                  </p>
                </div>
                <div className="flex items-center sm:items-end shrink-0">
                  <span className="flex items-center gap-1 text-xs text-primary font-medium group-hover:gap-2 transition-all">
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
