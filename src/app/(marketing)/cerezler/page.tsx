import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t("cookiesPage.pageTitle"),
    description: t("cookiesPage.metaDescription"),
  };
}

export default async function CerezlerPage() {
  const t = await getTranslations();
  const strong = (chunks: React.ReactNode) => <strong>{chunks}</strong>;
  const s3Items = t.raw("cookiesPage.s3Items") as string[];
  const translationNote = t("cookiesPage.translationNote");

  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">{t("cookiesPage.pageTitle")}</h1>
      <p className="text-sm text-muted-foreground mb-2">{t("cookiesPage.lastUpdated")}</p>
      {translationNote && (
        <p className="text-sm text-muted-foreground italic mb-8">{translationNote}</p>
      )}
      {!translationNote && <div className="mb-10" />}

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">

        <section>
          <h2 className="text-xl font-semibold mb-3">{t("cookiesPage.s1Title")}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t("cookiesPage.s1P")}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t("cookiesPage.s2Title")}</h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-sm mb-1">{t("cookiesPage.s2Necessary.title")}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {t("cookiesPage.s2Necessary.desc")}
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-1">{t("cookiesPage.s2Analytics.title")}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {t("cookiesPage.s2Analytics.desc")}
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-1">{t("cookiesPage.s2Functional.title")}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {t("cookiesPage.s2Functional.desc")}
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t("cookiesPage.s3Title")}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t("cookiesPage.s3P")}
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-2 text-sm">
            {s3Items.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t("cookiesPage.s4Title")}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t("cookiesPage.s4P")}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t("cookiesPage.s5Title")}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t.rich("cookiesPage.s5P", { strong })}
          </p>
        </section>

      </div>
    </div>
  );
}
