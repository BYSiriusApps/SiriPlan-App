"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { HomeButton } from "@/components/dashboard/HomeButton";
import { useTranslations } from "next-intl";
import {
  HelpCircle,
  PlayCircle,
  BookOpen,
  User,
  Settings,
  Scissors,
  Users,
  Calendar,
  Wallet,
  Globe,
  MessageSquare,
  Send,
  Megaphone,
  CreditCard,
  Heart,
  BarChart3,
  AlertTriangle,
  Lock,
  ChevronRight,
  Maximize2
} from "lucide-react";

export default function RehberPage() {
  const t = useTranslations("dashboard");
  const [activeTab, setActiveTab] = useState<string>("baslangic");
  const [isFullscreenSunum, setIsFullscreenSunum] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // Kopyalama ve Sağ Tık Engelleme Koruması
  useEffect(() => {
    const preventCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      toast.error("SiriPlan kılavuz içerikleri telif hakkı ile korunmaktadır ve kopyalanamaz.", {
        icon: "🔒"
      });
    };

    const preventRightClick = (e: MouseEvent) => {
      e.preventDefault();
    };

    // Belirli tuş kombinasyonlarını engelleme (F12, Ctrl+Shift+I, Ctrl+C)
    const preventInspect = (e: KeyboardEvent) => {
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && e.key === "I") ||
        (e.ctrlKey && e.shiftKey && e.key === "J") ||
        (e.ctrlKey && e.key === "u") ||
        (e.ctrlKey && e.key === "c")
      ) {
        e.preventDefault();
        toast.error("Bu sayfada geliştirici araçları ve kopyalama kısıtlanmıştır.", {
          icon: "🔒"
        });
      }
    };

    document.addEventListener("copy", preventCopy);
    document.addEventListener("contextmenu", preventRightClick);
    document.addEventListener("keydown", preventInspect);

    return () => {
      document.removeEventListener("copy", preventCopy);
      document.removeEventListener("contextmenu", preventRightClick);
      document.removeEventListener("keydown", preventInspect);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 1023px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const menuLabels = t.raw("guidePage.menu") as Record<string, string>;
  const sections = t.raw("guidePage.sections") as Record<string, {
    title: string;
    intro?: string;
    steps?: (string | { title: string; desc: string })[];
    items?: { label: string; desc: string }[];
    blocks?: { heading: string; text: string }[];
    paragraphs?: string[];
    faqs?: { q: string; a: string }[];
    subtitle?: string;
    fullscreenBtn?: string;
    fullscreenTitle?: string;
    closeEsc?: string;
    ipTitle?: string;
    ipText?: string;
  }>;

  const getMenuLabel = (id: string, def: string) => menuLabels[id] ?? def;

  const menuItems = [
    { id: "baslangic", icon: PlayCircle },
    { id: "giris", icon: User },
    { id: "panel", icon: Settings },
    { id: "hizmetler", icon: Scissors },
    { id: "personel", icon: Users },
    { id: "takvim", icon: Calendar },
    { id: "adisyon", icon: Wallet },
    { id: "vitrin", icon: Globe },
    { id: "whatsapp", icon: MessageSquare },
    { id: "telegram", icon: Send },
    { id: "kampanya", icon: Megaphone },
    { id: "abonelik", icon: CreditCard },
    { id: "sadakat", icon: Heart },
    { id: "maas", icon: Wallet },
    { id: "raporlar", icon: BarChart3 },
    { id: "sss", icon: HelpCircle },
    { id: "sunum", icon: BookOpen, highlight: true }
  ].map(item => ({ ...item, label: getMenuLabel(item.id, "") }));

  const guideSections = (
    <>
              {/* 1. HIZLI BAŞLANGIÇ */}
              {activeTab === "baslangic" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">{sections.baslangic.title}</h2>
                  <p className="text-muted-foreground leading-relaxed">{sections.baslangic.intro}</p>
                  <div className="space-y-3 mt-4">
                    {(sections.baslangic.steps as { title: string; desc: string }[]).map((step, i) => (
                      <div className="flex gap-3" key={step.title}>
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs shrink-0 mt-0.5">{i + 1}</div>
                        <div>
                          <h4 className="font-semibold">{step.title}</h4>
                          <p className="text-sm text-muted-foreground">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. GİRİŞ AKIŞI */}
              {activeTab === "giris" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">{sections.giris.title}</h2>
                  <p className="text-muted-foreground leading-relaxed">{sections.giris.intro}</p>
                  <ul className="space-y-3 list-disc pl-5 text-sm text-muted-foreground">
                    {(sections.giris.items as { label: string; desc: string }[]).map((item) => (
                      <li key={item.label}>
                        <strong className="text-foreground">{item.label}</strong>{" "}
                        {item.desc}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 3. PANEL KİŞİSELLEŞTİRME */}
              {activeTab === "panel" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">{sections.panel.title}</h2>
                  <p className="text-muted-foreground leading-relaxed">{sections.panel.intro}</p>
                  <ul className="space-y-3 list-disc pl-5 text-sm text-muted-foreground">
                    {(sections.panel.items as { label: string; desc: string }[]).map((item) => (
                      <li key={item.label}>
                        <b>{item.label}</b>{" "}
                        {item.desc}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 4. HİZMET TANIMLAMA */}
              {activeTab === "hizmetler" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">{sections.hizmetler.title}</h2>
                  <p className="text-muted-foreground leading-relaxed">{sections.hizmetler.intro}</p>
                  <ol className="space-y-3 list-decimal pl-5 text-sm text-muted-foreground">
                    {(sections.hizmetler.steps as string[]).map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* 5. PERSONEL & YETKİLER */}
              {activeTab === "personel" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">{sections.personel.title}</h2>
                  <p className="text-muted-foreground leading-relaxed">{sections.personel.intro}</p>
                  <ol className="space-y-3 list-decimal pl-5 text-sm text-muted-foreground">
                    {(sections.personel.steps as string[]).map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* 6. TAKVİM & RANDEVU */}
              {activeTab === "takvim" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">{sections.takvim.title}</h2>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    {(sections.takvim.blocks as { heading: string; text: string }[]).map((block, i) => (
                      <div key={block.heading}>
                        <h4 className={`font-semibold text-foreground${i > 0 ? " mt-4" : ""}`}>{block.heading}</h4>
                        <p>{block.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 7. ADİSYON & FİŞ YAZMA */}
              {activeTab === "adisyon" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">{sections.adisyon.title}</h2>
                  <p className="text-muted-foreground leading-relaxed">{sections.adisyon.intro}</p>
                  <ol className="space-y-3 list-decimal pl-5 text-sm text-muted-foreground">
                    {(sections.adisyon.steps as string[]).map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* 8. WEB VİTRİNİ */}
              {activeTab === "vitrin" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">{sections.vitrin.title}</h2>
                  <p className="text-muted-foreground leading-relaxed">{sections.vitrin.intro}</p>
                  <ul className="space-y-3 list-disc pl-5 text-sm text-muted-foreground">
                    {(sections.vitrin.items as { label: string; desc: string }[]).map((item) => (
                      <li key={item.label}>
                        <b>{item.label}</b>{" "}
                        {item.desc}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 9. BİLDİRİM AYARLARI */}
              {activeTab === "whatsapp" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">{sections.whatsapp.title}</h2>
                  <p className="text-muted-foreground leading-relaxed">{sections.whatsapp.intro}</p>
                  <ul className="space-y-3 list-disc pl-5 text-sm text-muted-foreground">
                    {(sections.whatsapp.items as { label: string; desc: string }[]).map((item) => (
                      <li key={item.label}>
                        <b>{item.label}</b>{" "}
                        {item.desc}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 10. TELEGRAM BOTU */}
              {activeTab === "telegram" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">{sections.telegram.title}</h2>
                  <p className="text-muted-foreground leading-relaxed">{sections.telegram.intro}</p>
                  <ol className="space-y-3 list-decimal pl-5 text-sm text-muted-foreground">
                    {(sections.telegram.steps as string[]).map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* 11. TOPLU KAMPANYALAR */}
              {activeTab === "kampanya" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">{sections.kampanya.title}</h2>
                  <p className="text-muted-foreground leading-relaxed">{sections.kampanya.intro}</p>
                  <ol className="space-y-3 list-decimal pl-5 text-sm text-muted-foreground">
                    {(sections.kampanya.steps as string[]).map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* 12. ÖDEME & ABONELİK */}
              {activeTab === "abonelik" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">{sections.abonelik.title}</h2>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    {(sections.abonelik.paragraphs as string[]).map((p) => (
                      <p key={p}>{p}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* 13. SADAKAT PUANLARI */}
              {activeTab === "sadakat" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">{sections.sadakat.title}</h2>
                  <p className="text-muted-foreground leading-relaxed">{sections.sadakat.intro}</p>
                  <ul className="space-y-3 list-disc pl-5 text-sm text-muted-foreground">
                    {(sections.sadakat.items as { label: string; desc: string }[]).map((item) => (
                      <li key={item.label}>
                        <b>{item.label}</b>{" "}
                        {item.desc}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 14. GELİR-GİDER & MAAŞ */}
              {activeTab === "maas" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">{sections.maas.title}</h2>
                  <ul className="space-y-3 list-disc pl-5 text-sm text-muted-foreground">
                    {(sections.maas.items as { label: string; desc: string }[]).map((item) => (
                      <li key={item.label}>
                        <b>{item.label}</b>{" "}
                        {item.desc}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 15. RAPORLAR & VERİ GÖÇÜ */}
              {activeTab === "raporlar" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">{sections.raporlar.title}</h2>
                  <ul className="space-y-3 list-disc pl-5 text-sm text-muted-foreground">
                    {(sections.raporlar.items as { label: string; desc: string }[]).map((item) => (
                      <li key={item.label}>
                        <b>{item.label}</b>{" "}
                        {item.desc}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 16. SIK SORULAN SORULAR */}
              {activeTab === "sss" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">{sections.sss.title}</h2>
                  <div className="space-y-4 text-sm">
                    {(sections.sss.faqs as { q: string; a: string }[]).map((faq) => (
                      <div key={faq.q}>
                        <h4 className="font-semibold text-foreground">{faq.q}</h4>
                        <p className="text-muted-foreground mt-1">{faq.a}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 🎬 İNTERAKTİF SUNUM (19 SLAYT) */}
              {activeTab === "sunum" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-foreground">{sections.sunum.title}</h2>
                      <p className="text-sm text-muted-foreground">{sections.sunum.subtitle}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsFullscreenSunum(!isFullscreenSunum)}
                      className="flex items-center gap-1.5 cursor-pointer"
                    >
                      <Maximize2 className="w-4 h-4" /> {sections.sunum.fullscreenBtn}
                    </Button>
                  </div>

                  {isFullscreenSunum ? (
                    <div className="fixed inset-0 z-50 bg-black flex flex-col">
                      <div className="p-4 bg-background border-b border-border flex items-center justify-between">
                        <span className="font-semibold text-foreground">{sections.sunum.fullscreenTitle}</span>
                        <Button variant="ghost" size="sm" onClick={() => setIsFullscreenSunum(false)} className="cursor-pointer">
                          {sections.sunum.closeEsc}
                        </Button>
                      </div>
                      <iframe src="/api/docs/presentation" className="w-full flex-1 border-0" title="SiriPlan Sunum" />
                    </div>
                  ) : (
                    <div className="w-full h-[70vh] min-h-[440px] border border-border rounded-xl overflow-hidden bg-black shadow-lg relative">
                      <iframe src="/api/docs/presentation" className="w-full h-full border-0" title="SiriPlan Sunum" />
                    </div>
                  )}

                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-lg p-3 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>
                      <strong>{sections.sunum.ipTitle}</strong>{" "}
                      {sections.sunum.ipText}
                    </p>
                  </div>
                </div>
              )}
    </>
  );

  return (
    <div className="p-6 space-y-6 select-none">
      {/* Üst Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 text-primary shrink-0">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/70">
              {t("guidePage.supportEducation")}
            </span>
            <h1 className="text-2xl md:text-3xl font-bold brand-gradient-text leading-tight">{t("guide")}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 px-3 py-1 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            {t("guidePage.copyProtected")}
          </Badge>
          <HomeButton />
        </div>
      </div>

      {isMobile ? (
        <div className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <div
                key={item.id}
                className={`rounded-xl border overflow-hidden ${isActive ? "border-primary/40" : "border-border"}`}
              >
                <button
                  onClick={() => setActiveTab(isActive ? "" : item.id)}
                  aria-expanded={isActive}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-left transition-colors cursor-pointer ${isActive ? "bg-primary/10 text-foreground" : item.highlight ? "bg-primary/5 text-primary" : "text-muted-foreground"}`}
                >
                  <Icon className="w-4.5 h-4.5 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isActive ? "rotate-90" : ""}`} />
                </button>
                {isActive && (
                  <div className="px-4 pb-5 pt-2 border-t border-border">{guideSections}</div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Sol Menü */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-left transition-all cursor-pointer ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : item.highlight
                    ? "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                    : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                }`}
              >
                <Icon className="w-4.5 h-4.5 shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
                <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${isActive ? "rotate-90" : ""}`} />
              </button>
            );
          })}
        </div>

        {/* Sağ İçerik Paneli */}
        <div className="lg:col-span-8 xl:col-span-9">
          <Card className="border-border shadow-md">
            <CardContent className="pt-6 space-y-6">{guideSections}</CardContent>
          </Card>
        </div>
      </div>
      )}
    </div>
  );
}
