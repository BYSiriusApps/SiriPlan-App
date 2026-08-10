import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t("privacyPage.pageTitle"),
    description: t("privacyPage.metaDescription"),
  };
}

export default async function GizlilikPage() {
  const t = await getTranslations();
  const strong = (chunks: React.ReactNode) => <strong>{chunks}</strong>;
  const s2Items = t.raw("privacyPage.s2Items") as string[];
  const s3Items = t.raw("privacyPage.s3Items") as string[];
  const s6Items = t.raw("privacyPage.s6Items") as string[];
  const translationNote = t("privacyPage.translationNote");

  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">{t("privacyPage.pageTitle")}</h1>
      <p className="text-sm text-muted-foreground mb-2">{t("privacyPage.lastUpdated")}</p>
      {translationNote && (
        <p className="text-sm text-muted-foreground italic mb-8">{translationNote}</p>
      )}
      {!translationNote && <div className="mb-10" />}

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">

        <section>
          <h2 className="text-xl font-semibold mb-3">{t("privacyPage.s1Title")}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t.rich("privacyPage.s1P1", { strong })}
          </p>
          <p className="text-muted-foreground leading-relaxed mt-2">
            {t.rich("privacyPage.s1P2", { strong })}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t("privacyPage.s2Title")}</h2>
          <p className="text-muted-foreground leading-relaxed mb-2">{t("privacyPage.s2Intro")}</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            {s2Items.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t("privacyPage.s3Title")}</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            {s3Items.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t("privacyPage.s4Title")}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t("privacyPage.s4P")}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t("privacyPage.s5Title")}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t("privacyPage.s5P")}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t("privacyPage.s6Title")}</h2>
          <p className="text-muted-foreground leading-relaxed mb-2">{t("privacyPage.s6Intro")}</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            {s6Items.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-3">
            {t.rich("privacyPage.s6Contact", { strong })}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t("privacyPage.s7Title")}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t("privacyPage.s7P")}
          </p>
        </section>

      </div>
    </div>
  );
}
