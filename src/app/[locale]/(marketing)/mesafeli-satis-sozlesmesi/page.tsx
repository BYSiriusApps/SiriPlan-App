import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { buildAlternates } from "@/lib/seo/alternates";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { LEGAL_DOCS } from "@/lib/legal/distance-sales";

const DOC = "contract" as const;
const PATH = "/mesafeli-satis-sozlesmesi";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const doc = LEGAL_DOCS[DOC][locale === "tr" ? "tr" : "en"];
  return {
    title: doc.title,
    description: doc.subtitle,
    alternates: await buildAlternates(PATH),
  };
}

export default async function Page() {
  const locale = await getLocale();
  const t = await getTranslations();
  const lang = locale === "tr" ? "tr" : "en";
  return (
    <LegalDocument
      doc={LEGAL_DOCS[DOC][lang]}
      note={lang === "tr" ? undefined : t("legalDocs.note")}
      otherDocs={[
        { href: "/mesafeli-satis-sozlesmesi", label: t("footer.distanceSales") },
        { href: "/on-bilgilendirme-formu", label: t("footer.preinfo") },
        { href: "/iade-iptal-politikasi", label: t("footer.refund") },
        { href: "/kosullar", label: t("footer.terms") },
        { href: "/gizlilik", label: t("footer.privacy") },
      ]}
    />
  );
}
