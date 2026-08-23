"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Copyright, Cpu, Smartphone, FileText, CheckCircle2 } from "lucide-react";

interface LegalNoticeModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LegalNoticeModal({ isOpen, onOpenChange }: LegalNoticeModalProps) {
  const t = useTranslations("dashboard.legalModal");

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <DialogTitle className="text-lg font-bold">{t("title")}</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            {t("copyright")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-3 text-sm leading-relaxed text-muted-foreground">
          {/* AI and IP Section */}
          <div className="p-3.5 rounded-xl border border-border bg-muted/20">
            <div className="flex gap-2.5 items-start">
              <Cpu className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                  Fikri Mülkiyet & AI Güvencesi
                </h4>
                <p className="text-xs mt-1.5">
                  {t("aiNotice")}
                </p>
              </div>
            </div>
          </div>

          {/* Store App Store / Play Store Section */}
          <div className="p-3.5 rounded-xl border border-border bg-muted/20">
            <div className="flex gap-2.5 items-start">
              <Smartphone className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                  Mobil Mağaza ve Platform Uyumluluğu
                </h4>
                <p className="text-xs mt-1.5">
                  {t("storeNotice")}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 text-[10px] bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                    <CheckCircle2 className="w-3 h-3" /> App Store Uyumlu
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                    <CheckCircle2 className="w-3 h-3" /> Play Store Uyumlu
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                    <CheckCircle2 className="w-3 h-3" /> GDPR / KVKK Uyumlu
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Official Certificates Guide */}
          <div className="p-3.5 rounded-xl border border-border bg-muted/20">
            <div className="flex gap-2.5 items-start">
              <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="w-full">
                <h4 className="font-semibold text-foreground text-sm">
                  Yasal Hak Sahipliği Yol Haritası (Alabileceğiniz Belgeler)
                </h4>
                <p className="text-xs mt-1">
                  Yazılımınızın resmi yasal güvencesini pekiştirmek için aşağıdaki adımları atmanız önerilir:
                </p>
                <ul className="mt-2 space-y-1.5 text-xs list-disc pl-4">
                  <li>
                    <strong className="text-foreground">TÜRKPATENT Marka Tescili:</strong> Uygulama adı "Siriplan" ve logosu için tescil başvurusu yapın. (Kritik)
                  </li>
                  <li>
                    <strong className="text-foreground">Kültür Bakanlığı Kayıt-Tescil:</strong> Yazılımınızın kaynak kodlarını e-Devlet Telif Ofisi üzerinden adınıza tescil ettirin.
                  </li>
                  <li>
                    <strong className="text-foreground">Zaman Damgalı Kaynak Kod Kanıtı:</strong> E-İmza sağlayıcıları aracılığıyla kaynak kod hash damgası alarak tescil tarihini sabitleyin.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {t("close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
