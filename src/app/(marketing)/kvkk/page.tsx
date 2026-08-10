import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

const DATA_ROW_KEYS = ["identity", "contact", "business", "transaction", "technical"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t("kvkkPage.pageTitle"),
    description: t("kvkkPage.metaDescription"),
  };
}

export default async function KVKKPage() {
  const t = await getTranslations();
  const strong = (chunks: React.ReactNode) => <strong>{chunks}</strong>;
  const purposeItems = t.raw("kvkkPage.purposeItems") as string[];
  const rightsItems = t.raw("kvkkPage.rightsItems") as string[];
  const translationNote = t("kvkkPage.translationNote");

  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">{t("kvkkPage.pageTitle")}</h1>
      <p className="text-sm text-muted-foreground mb-2">{t("kvkkPage.lawSubtitle")}</p>
      <p className="text-sm text-muted-foreground mb-2">{t("kvkkPage.lastUpdated")}</p>
      {translationNote && (
        <p className="text-sm text-muted-foreground italic mb-10">{translationNote}</p>
      )}

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">

        <section>
          <h2 className="text-xl font-semibold mb-3">{t("kvkkPage.controllerTitle")}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t.rich("kvkkPage.controllerP1", { strong })}
          </p>
          <p className="text-muted-foreground leading-relaxed mt-2">
            {t.rich("kvkkPage.controllerContact", { strong })}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t("kvkkPage.dataTitle")}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-muted-foreground border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 font-semibold text-foreground">{t("kvkkPage.dataTableCategory")}</th>
                  <th className="text-left py-2 font-semibold text-foreground">{t("kvkkPage.dataTableExamples")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {DATA_ROW_KEYS.map((key) => (
                  <tr key={key}>
                    <td className="py-2 pr-4">{t(`kvkkPage.dataRows.${key}.category`)}</td>
                    <td className="py-2">{t(`kvkkPage.dataRows.${key}.examples`)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t("kvkkPage.purposeTitle")}</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            {purposeItems.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t("kvkkPage.transferTitle")}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t("kvkkPage.transferP")}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t("kvkkPage.rightsTitle")}</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            {rightsItems.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t("kvkkPage.applicationTitle")}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t("kvkkPage.applicationP1")}
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-2">
            <li>{t.rich("kvkkPage.applicationEmail", { strong })}</li>
            <li>{t.rich("kvkkPage.applicationWeb", { strong })}</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-3">
            {t("kvkkPage.applicationP2")}
          </p>
        </section>

      </div>
    </div>
  );
}
