"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Native uygulamada (App Store/Play Store) yasal metin sayfalarının (KVKK,
 * gizlilik, koşullar) tek gezinme öğesi: menü/fiyat/footer yok, sadece geri.
 * Kayıt formundan aynı sekmede açıldığı için geri dönüş formu (taslağıyla)
 * yeniden açar.
 */
export function NativeLegalBar() {
  const router = useRouter();
  const t = useTranslations("auth.registerPage");
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 px-4 py-3">
      <button
        type="button"
        onClick={() => {
          if (window.history.length > 1) router.back();
          else router.push("/auth/kayit");
        }}
        className="inline-flex items-center gap-2 text-sm font-medium text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("legalBack")}
      </button>
    </header>
  );
}
