"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

/**
 * Ödeme öncesi zorunlu onaylar (6502 / Mesafeli Sözleşmeler Yönetmeliği):
 *  1) Mesafeli Satış Sözleşmesi + Ön Bilgilendirme Formu okundu/kabul edildi
 *  2) Hizmetin hemen başlamasını talep ediyorum / cayma hakkı kaybı bilgilendirmesi
 * Her ikisi de işaretlenmeden /api/stripe/checkout çağrılmaz; sunucu da `consent`
 * alanını ayrıca zorunlu tutar ve onayı Stripe metadata + audit_logs'a yazar.
 */
export type PurchaseConsentValue = { distanceSales: boolean; immediateStart: boolean };

export const EMPTY_CONSENT: PurchaseConsentValue = { distanceSales: false, immediateStart: false };

export function isConsentComplete(v: PurchaseConsentValue) {
  return v.distanceSales && v.immediateStart;
}

export function PurchaseConsent({
  value,
  onChange,
  highlight = false,
  idPrefix = "pc",
}: {
  value: PurchaseConsentValue;
  onChange: (v: PurchaseConsentValue) => void;
  highlight?: boolean;
  idPrefix?: string;
}) {
  const t = useTranslations("purchaseConsent");
  const link = (href: string) =>
    function LegalLink(chunks: React.ReactNode) {
      return (
        <Link href={href} target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline">
          {chunks}
        </Link>
      );
    };

  return (
    <div
      id={`${idPrefix}-box`}
      className={`rounded-xl border bg-card/70 p-4 text-left space-y-3 transition-colors ${
        highlight ? "border-red-400 ring-2 ring-red-200" : "border-border"
      }`}
      role="group"
      aria-label={t("title")}
    >
      <p className="text-sm font-semibold">{t("title")}</p>
      <div className="flex items-start gap-3">
        <input
          id={`${idPrefix}-distance`}
          type="checkbox"
          className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-[var(--primary)]"
          checked={value.distanceSales}
          onChange={(e) => onChange({ ...value, distanceSales: e.target.checked })}
        />
        <label htmlFor={`${idPrefix}-distance`} className="text-xs leading-relaxed cursor-pointer text-muted-foreground">
          {t.rich("distanceLabel", {
            contractLink: link("/mesafeli-satis-sozlesmesi"),
            preinfoLink: link("/on-bilgilendirme-formu"),
            refundLink: link("/iade-iptal-politikasi"),
          })}{" "}
          <span className="text-red-500 font-medium">*</span>
        </label>
      </div>
      <div className="flex items-start gap-3">
        <input
          id={`${idPrefix}-immediate`}
          type="checkbox"
          className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-[var(--primary)]"
          checked={value.immediateStart}
          onChange={(e) => onChange({ ...value, immediateStart: e.target.checked })}
        />
        <label htmlFor={`${idPrefix}-immediate`} className="text-xs leading-relaxed cursor-pointer text-muted-foreground">
          {t("immediateLabel")} <span className="text-red-500 font-medium">*</span>
        </label>
      </div>
      <p className="text-[11px] text-muted-foreground/80 leading-relaxed">{t("vatNote")}</p>
    </div>
  );
}
