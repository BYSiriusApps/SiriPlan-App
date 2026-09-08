import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t("securityPage.pageTitle"),
    description: t("securityPage.metaDescription"),
  };
}

export default async function GuvenlikPage() {
  const t = await getTranslations();
  const rulesItems = t.raw("securityPage.rulesItems") as string[];

  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">{t("securityPage.pageTitle")}</h1>
      <p className="text-sm text-muted-foreground mb-10">{t("securityPage.lastUpdated")}</p>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">
        <p className="text-muted-foreground leading-relaxed">{t("securityPage.intro")}</p>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t("securityPage.reportTitle")}</h2>
          <p className="text-muted-foreground leading-relaxed">{t("securityPage.reportP")}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t("securityPage.rulesTitle")}</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            {rulesItems.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t("securityPage.harborTitle")}</h2>
          <p className="text-muted-foreground leading-relaxed">{t("securityPage.harborP")}</p>
        </section>
      </div>
    </div>
  );
}
