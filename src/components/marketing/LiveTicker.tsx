import { getTranslations } from "next-intl/server";

/**
 * Kayan "canlı bar": ürünün temel vaatlerini iki satırda, zıt yönlerde akan
 * vurucu cümlelerle gösterir. Salt CSS animasyonu; üzerine gelince durur,
 * "azaltılmış hareket" tercihinde animasyon kapanır ve satır kaydırılabilir olur.
 */
export async function LiveTicker() {
  const t = await getTranslations("homeVisual");
  const items = t.raw("ticker") as string[];
  const half = Math.ceil(items.length / 2);
  const rows = [items.slice(0, half), items.slice(half)];

  return (
    <section
      className="relative overflow-hidden border-y border-border bg-primary/5 py-5"
      aria-label={t("tickerLabel")}
    >
      <div className="space-y-3 [mask-image:linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent)]">
        {rows.map((row, ri) => (
          <div key={ri} className="sp-marquee-wrap overflow-hidden">
            <div
              className={`sp-marquee flex w-max gap-3 ${ri === 1 ? "sp-marquee-rev" : ""}`}
              dir="ltr"
            >
              {[...row, ...row].map((text, i) => (
                <span
                  key={i}
                  dir="auto"
                  aria-hidden={i >= row.length ? "true" : undefined}
                  className="inline-flex shrink-0 items-center gap-2.5 rounded-full border border-primary/25 bg-card px-5 py-2.5 text-sm font-medium text-foreground shadow-sm"
                >
                  <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                  {text}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
