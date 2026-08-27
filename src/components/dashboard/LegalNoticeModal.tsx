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
import { ShieldCheck, Cpu, Smartphone, CheckCircle2 } from "lucide-react";

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
                  {t("title").includes("Notice") ? "Intellectual Property & AI Guarantee" : 
                   t("title").includes("Bildirimi") ? "Fikri Mülkiyet & AI Güvencesi" :
                   t("title").includes("Права") ? "Интеллектуальная собственность и гарантия ИИ" :
                   "الملكية الفكرية وضمان الذكاء الاصطناعي"}
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
                  {t("title").includes("Notice") ? "Mobile Store & Platform Compatibility" : 
                   t("title").includes("Bildirimi") ? "Mobil Mağaza ve Platform Uyumluluğu" :
                   t("title").includes("Права") ? "Совместимость с мобильными магазинами и платформами" :
                   "التوافق مع متاجر الهواتف والمنصات"}
                </h4>
                <p className="text-xs mt-1.5">
                  {t("storeNotice")}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 text-[10px] bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                    <CheckCircle2 className="w-3 h-3" /> {t("title").includes("Notice") ? "App Store Compliant" : t("title").includes("Bildirimi") ? "App Store Uyumlu" : t("title").includes("Права") ? "Совместимо с App Store" : "متوافق مع App Store"}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                    <CheckCircle2 className="w-3 h-3" /> {t("title").includes("Notice") ? "Play Store Compliant" : t("title").includes("Bildirimi") ? "Play Store Uyumlu" : t("title").includes("Права") ? "Совместимо с Play Store" : "متوافق مع Play Store"}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                    <CheckCircle2 className="w-3 h-3" /> {t("title").includes("Notice") ? "GDPR / KVKK Compliant" : t("title").includes("Bildirimi") ? "GDPR / KVKK Uyumlu" : t("title").includes("Права") ? "Совместимо с GDPR / KVKK" : "متوافق مع GDPR / KVKK"}
                  </span>
                </div>
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
