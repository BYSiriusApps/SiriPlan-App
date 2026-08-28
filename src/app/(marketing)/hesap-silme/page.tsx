import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t("accountDeletionPage.pageTitle"),
    description: t("accountDeletionPage.metaDescription"),
  };
}

export default async function HesapSilmePage() {
  const t = await getTranslations();
  const strong = (chunks: React.ReactNode) => <strong>{chunks}</strong>;
  const inAppSteps = t.raw("accountDeletionPage.inAppSteps") as string[];
  const deletedItems = t.raw("accountDeletionPage.deletedItems") as string[];

  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">{t("accountDeletionPage.pageTitle")}</h1>
      <p className="text-sm text-muted-foreground mb-2">{t("accountDeletionPage.lastUpdated")}</p>
      <p className="text-sm text-muted-foreground mb-8">
        {t.rich("accountDeletionPage.appInfo", { strong })}
      </p>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">
        <p className="text-muted-foreground leading-relaxed">
          {t("accountDeletionPage.intro")}
        </p>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t("accountDeletionPage.inAppTitle")}</h2>
          <p className="text-muted-foreground leading-relaxed mb-2">
            {t("accountDeletionPage.inAppP")}
          </p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            {inAppSteps.map((item) => <li key={item}>{item}</li>)}
          </ol>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t("accountDeletionPage.emailTitle")}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t.rich("accountDeletionPage.emailP", { strong })}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t("accountDeletionPage.partialTitle")}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t.rich("accountDeletionPage.partialP", { strong })}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t("accountDeletionPage.deletedTitle")}</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            {deletedItems.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t("accountDeletionPage.retainedTitle")}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t("accountDeletionPage.retainedP")}
          </p>
        </section>

        <p className="text-muted-foreground leading-relaxed">
          {t.rich("accountDeletionPage.contactNote", { strong })}
        </p>
      </div>
    </div>
  );
}
