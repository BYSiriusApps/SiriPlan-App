import type { Metadata } from "next";
import { Mail, Phone, MapPin, Clock, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { getTranslations } from "next-intl/server";

const CONTACT_META = [
  { key: "email", icon: Mail, value: "destek@siriplan.com", href: "mailto:destek@siriplan.com", color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-950/30" },
  { key: "phone", icon: Phone, value: "+90 535 503 26 34", href: "https://wa.me/905355032634", color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  { key: "address", icon: MapPin, href: "https://bysirius.com", color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30" },
  { key: "hours", icon: Clock, href: null, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30" },
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t("nav.contact"),
    description: t("contactPage.metaDescription"),
  };
}

export default async function IletisimPage() {
  const t = await getTranslations();

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="py-16 md:py-24 border-b border-border bg-muted/20">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <MessageCircle className="w-3.5 h-3.5" />
            {t("contactPage.heroEyebrow")}
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            {t("contactPage.heroTitle")}<br />
            <span className="brand-gradient-text">{t("contactPage.heroTitleHighlight")}</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            {t("contactPage.heroSubtitle")}
          </p>
        </div>
      </section>

      {/* Contact info + Form */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid md:grid-cols-2 gap-12">

            {/* Left: Contact info */}
            <div>
              <h2 className="text-2xl font-bold mb-6">{t("contactPage.infoTitle")}</h2>
              <div className="space-y-4 mb-8">
                {CONTACT_META.map((c) => {
                  const value = "value" in c ? c.value : t(`contactPage.info.${c.key}.value`);
                  return (
                    <div key={c.key} className="flex items-start gap-4 p-4 bg-card rounded-xl border border-border">
                      <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}>
                        <c.icon className={`w-5 h-5 ${c.color}`} />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">{t(`contactPage.info.${c.key}.label`)}</p>
                        {c.href ? (
                          <a
                            href={c.href}
                            target={c.href.startsWith("http") ? "_blank" : undefined}
                            rel="noopener noreferrer"
                            className="font-semibold text-sm hover:text-primary transition-colors"
                          >
                            {value}
                          </a>
                        ) : (
                          <p className="font-semibold text-sm">{value}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* WhatsApp CTA */}
              <a
                href="https://wa.me/905355032634?text=Merhaba%2C%20Siriplan%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum."
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 bg-[#25D366]/10 border border-[#25D366]/30 rounded-xl hover:bg-[#25D366]/20 transition-all group"
              >
                <svg viewBox="0 0 24 24" className="w-8 h-8 fill-[#25D366] shrink-0" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{t("contactPage.whatsappCtaTitle")}</p>
                  <p className="text-xs text-muted-foreground">{t("contactPage.whatsappCtaDesc")}</p>
                </div>
                <Send className="w-4 h-4 text-[#25D366] group-hover:translate-x-1 transition-transform" />
              </a>
            </div>

            {/* Right: Form */}
            <div className="bg-card rounded-2xl border border-border p-6 md:p-8">
              <h2 className="text-2xl font-bold mb-2">{t("contactPage.formTitle")}</h2>
              <p className="text-sm text-muted-foreground mb-6">
                {t("contactPage.formSubtitle")}
              </p>
              <form
                action="mailto:destek@siriplan.com"
                method="post"
                encType="text/plain"
                className="space-y-4"
              >
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">{t("contactPage.fieldName")}</Label>
                    <Input id="name" name="name" placeholder={t("contactPage.fieldNamePlaceholder")} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">{t("contactPage.fieldPhone")}</Label>
                    <Input id="phone" name="phone" placeholder="+90 5xx xxx xx xx" type="tel" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">{t("contactPage.fieldEmail")}</Label>
                  <Input id="email" name="email" placeholder={t("contactPage.fieldEmailPlaceholder")} type="email" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="subject">{t("contactPage.fieldSubject")}</Label>
                  <Input id="subject" name="subject" placeholder={t("contactPage.fieldSubjectPlaceholder")} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="message">{t("contactPage.fieldMessage")}</Label>
                  <Textarea
                    id="message"
                    name="message"
                    placeholder={t("contactPage.fieldMessagePlaceholder")}
                    rows={5}
                    required
                  />
                </div>
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" id="kvkk" name="kvkk" required className="mt-0.5 shrink-0" />
                  <label htmlFor="kvkk">
                    {t.rich("contactPage.kvkkConsent", {
                      kvkkLink: (chunks) => <a href="/kvkk" className="underline hover:text-primary">{chunks}</a>,
                      gizlilikLink: (chunks) => <a href="/gizlilik" className="underline hover:text-primary">{chunks}</a>,
                    })}
                  </label>
                </div>
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 gap-2">
                  <Send className="w-4 h-4" />
                  {t("contactPage.submitButton")}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Support channels */}
      <section className="py-12 bg-muted/20 border-t border-border">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-xl font-bold mb-6">{t("contactPage.otherChannelsTitle")}</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <a
              href="mailto:destek@siriplan.com"
              className="p-5 bg-card rounded-xl border border-border hover:border-primary/40 transition-all group"
            >
              <Mail className="w-6 h-6 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="font-semibold text-sm mb-1">{t("contactPage.emailSupport")}</p>
              <p className="text-xs text-muted-foreground">destek@siriplan.com</p>
            </a>
            <a
              href="https://wa.me/905355032634"
              target="_blank"
              rel="noopener noreferrer"
              className="p-5 bg-card rounded-xl border border-border hover:border-[#25D366]/40 transition-all group"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-[#25D366] mx-auto mb-2 group-hover:scale-110 transition-transform" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              <p className="font-semibold text-sm mb-1">{t("contactPage.whatsappSupport")}</p>
              <p className="text-xs text-muted-foreground">+90 535 503 26 34</p>
            </a>
            <a
              href="https://bysirius.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-5 bg-card rounded-xl border border-border hover:border-primary/40 transition-all group"
            >
              <MessageCircle className="w-6 h-6 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="font-semibold text-sm mb-1">{t("contactPage.bySirius")}</p>
              <p className="text-xs text-muted-foreground">bysirius.com</p>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
