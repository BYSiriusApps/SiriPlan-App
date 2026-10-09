import Link from "next/link";
import type { LegalDoc } from "@/lib/legal/distance-sales";

/** Mesafeli satış belgeleri için ortak sayfa gövdesi (kosullar sayfasıyla aynı görünüm). */
export function LegalDocument({
  doc,
  note,
  otherDocs,
}: {
  doc: LegalDoc;
  note?: string;
  otherDocs: { href: string; label: string }[];
}) {
  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">{doc.title}</h1>
      {doc.subtitle && <p className="text-sm text-muted-foreground mb-2">{doc.subtitle}</p>}
      {note && <p className="text-sm text-muted-foreground italic mb-6">{note}</p>}

      {doc.intro?.map((p) => (
        <p key={p} className="text-muted-foreground leading-relaxed mb-6">
          {p}
        </p>
      ))}

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">
        {doc.sections.map((s) => (
          <section key={s.h}>
            <h2 className="text-xl font-semibold mb-3">{s.h}</h2>
            <div className="space-y-3">
              {s.p.map((line) => (
                <p key={line} className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {line}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <nav className="mt-12 pt-6 border-t border-border text-sm flex flex-wrap gap-x-6 gap-y-2" aria-label="Legal">
        {otherDocs.map((d) => (
          <Link key={d.href} href={d.href} className="text-primary hover:underline">
            {d.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
