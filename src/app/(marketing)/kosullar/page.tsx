import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t("termsPage.pageTitle"),
    description: t("termsPage.metaDescription"),
  };
}

export default async function KosullarPage() {
  const t = await getTranslations();
  const strong = (chunks: React.ReactNode) => <strong>{chunks}</strong>;
  const s3Items = t.raw("termsPage.s3Items") as string[];
  const translationNote = t("termsPage.translationNote");

  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">{t("termsPage.pageTitle")}</h1>
      <p className="text-sm text-muted-foreground mb-2">{t("termsPage.lastUpdated")}</p>
      {translationNote && (
        <p className="text-sm text-muted-foreground italic mb-8">{translationNote}</p>
      )}
      {!translationNote && <div className="mb-10" />}

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">

        <section>
          <h2 className="text-xl font-semibold mb-3">{t("termsPage.s1Title")}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t.rich("termsPage.s1P", { strong })}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t("termsPage.s2Title")}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t("termsPage.s2P")}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t("termsPage.s3Title")}</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            {s3Items.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t("termsPage.s4Title")}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t("termsPage.s4P")}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t("termsPage.s5Title")}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t("termsPage.s5P")}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t("termsPage.s6Title")}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t("termsPage.s6P")}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t("termsPage.s7Title")}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t("termsPage.s7P")}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t("termsPage.s8Title")}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t("termsPage.s8P")}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t("termsPage.s10Title")}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t("termsPage.s10P")}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t("termsPage.s11Title")}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t("termsPage.s11P")}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t("termsPage.s9Title")}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t.rich("termsPage.s9P", { strong })}
          </p>
        </section>

      </div>
    </div>
  );
}
