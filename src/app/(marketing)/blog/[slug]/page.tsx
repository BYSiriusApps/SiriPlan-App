import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { blogPosts, getBlogPost } from "@/lib/blog-posts";

type Params = { slug: string };

export async function generateStaticParams() {
  return blogPosts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date,
    },
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

function markdownToHtml(content: string): string {
  return content
    .trim()
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-8 mb-3">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-6 mb-2">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^---$/gm, '<hr class="my-8 border-border" />')
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-primary/40 pl-4 italic text-muted-foreground my-4">$1</blockquote>')
    .replace(/^- (.+)$/gm, '<li class="ml-5 list-disc text-sm leading-relaxed">$1</li>')
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, '<ul class="space-y-1.5 my-4">$&</ul>')
    .replace(/^\| (.+) \|$/gm, (match) => {
      const cells = match.slice(1, -1).split(" | ");
      const isHeader = false;
      return `<tr>${cells.map((c) => `<td class="border border-border px-3 py-2 text-sm">${c.trim()}</td>`).join("")}</tr>`;
    })
    .replace(/(^✅.+$)/gm, '<p class="flex items-center gap-2 text-sm">$1</p>')
    .replace(/\n\n/g, '</p><p class="text-sm text-muted-foreground leading-relaxed my-3">')
    .replace(/^(.+)$/gm, (match) => {
      if (match.startsWith("<")) return match;
      return match;
    });
}

export default async function BlogPostPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const relatedPosts = blogPosts.filter((p) => p.slug !== slug).slice(0, 2);

  return (
    <div className="flex flex-col">
      {/* Header */}
      <section className="py-12 md:py-16 border-b border-border bg-muted/20">
        <div className="container mx-auto px-4 max-w-3xl">
          <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Blog&apos;a Dön
          </Link>
          <div className="flex items-center gap-2 mb-4">
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${CATEGORY_COLORS[post.category] || "bg-muted text-muted-foreground"}`}>
              {post.category}
            </span>
          </div>
          <h1 className="text-2xl md:text-4xl font-bold mb-4 leading-snug">
            {post.title}
          </h1>
          <p className="text-muted-foreground text-base mb-6 leading-relaxed">
            {post.excerpt}
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              {post.author}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {post.date}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {post.readTime} okuma
            </span>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <div
            className="prose prose-sm max-w-none text-foreground"
            dangerouslySetInnerHTML={{
              __html: markdownToHtml(post.content),
            }}
          />
        </div>
      </section>

      {/* CTA */}
      <section className="py-10 bg-primary/5 border-y border-primary/20">
        <div className="container mx-auto px-4 max-w-xl text-center">
          <h2 className="text-xl font-bold mb-3">14 Gün Ücretsiz Deneyin</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Kredi kartı gerekmez. Verileriniz güvende.
          </p>
          <Link href="/auth/kayit">
            <Button className="bg-primary hover:bg-primary/90 gap-2">
              Ücretsiz Başlayın
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Related posts */}
      {relatedPosts.length > 0 && (
        <section className="py-12">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-xl font-bold mb-6">İlgili Yazılar</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              {relatedPosts.map((related) => (
                <Link
                  key={related.slug}
                  href={`/blog/${related.slug}`}
                  className="group p-5 bg-card rounded-xl border border-border hover:border-primary/30 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[related.category] || "bg-muted text-muted-foreground"}`}>
                      {related.category}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{related.readTime} okuma</span>
                  </div>
                  <h3 className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors">
                    {related.title}
                  </h3>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
