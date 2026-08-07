import { createClient } from "@/lib/supabase/server";
import { getActiveMember } from "@/lib/active-org";
import { redirect, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft, Phone, Mail, Star, Calendar, Gift, Megaphone, MegaphoneOff, ShieldCheck, MessageCircle, Ban, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Customer, Appointment } from "@/types/database";
import SendKvkkLinkButton from "./SendKvkkLinkButton";
import BlockOnlineBookingToggle from "./BlockOnlineBookingToggle";
import CustomerLanguageSelect from "./CustomerLanguageSelect";
import { STATUS_LABEL_KEYS } from "@/lib/appointment-status";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";

function scoreColor(score: number) {
  if (score >= 70) return "bg-green-100 text-green-800";
  if (score >= 40) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
}

export default async function MusteriDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("dashboard");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/giris");

  const member = await getActiveMember(supabase);
  if (!member) redirect("/auth/kayit");

  const [{ data: customer }, { data: appointments }] = await Promise.all([
    supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .eq("org_id", member.org_id)
      .single(),
    supabase
      .from("appointments")
      .select("*, staff:staff!appointments_staff_id_fkey(full_name), service:services(name)")
      .eq("org_id", member.org_id)
      .eq("customer_id", id)
      .order("appointment_at", { ascending: false })
      .limit(30),
  ]);

  if (!customer) notFound();
  const c = customer as Customer;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/musteriler" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold brand-gradient-text">{c.full_name}</h1>
        <Badge className={cn("ml-auto text-xs", scoreColor(c.score))}>
          <Star className="h-3 w-3 mr-1 fill-current" />
          {c.score} {t("customerDetail.scoreSuffix")}
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Contact */}
        <Card className="kpi-tile border-0 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("customerDetail.contactTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a href={`tel:${c.phone}`} className="text-primary hover:underline">{c.phone}</a>
              <a
                href={`https://wa.me/${c.phone.replace(/\D/g, "").replace(/^0/, "90")}`}
                target="_blank"
                rel="noopener noreferrer"
                title="WhatsApp ile mesaj gönder"
                className="ml-auto inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs font-medium hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </a>
            </div>
            {c.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{c.email}</span>
              </div>
            )}
            {c.birth_date && (
              <div className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-muted-foreground" />
                <span>{format(new Date(c.birth_date), "d MMMM", { locale: tr })} doğumlu</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">
                {c.preferred_language
                  ? SUPPORTED_LANGUAGES.find((l) => l.code === c.preferred_language)?.name ?? c.preferred_language
                  : t("noLanguage")}
              </span>
              <div className="ml-auto">
                <CustomerLanguageSelect customerId={c.id} preferredLanguage={c.preferred_language} />
              </div>
            </div>
            {c.notes && (
              <p className="text-muted-foreground text-xs pt-1 border-t">{c.notes}</p>
            )}

            {/* KVKK & Kampanya onayları */}
            <div className="pt-2 mt-1 border-t space-y-1.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className={cn("h-4 w-4 shrink-0", c.kvkk_consent ? "text-green-500" : "text-muted-foreground/40")} />
                <span className={cn("text-xs", c.kvkk_consent ? "text-foreground" : "text-muted-foreground")}>
                  KVKK onayı{" "}
                  {c.kvkk_consent
                    ? c.kvkk_consent_at
                      ? `verildi (${format(new Date(c.kvkk_consent_at), "d MMM yyyy", { locale: tr })})`
                      : "verildi"
                    : "yok"}
                </span>
                {!c.kvkk_consent && <SendKvkkLinkButton customerId={c.id} phone={c.phone} />}
              </div>
              <div className="flex items-center gap-2">
                {c.marketing_consent ? (
                  <Megaphone className="h-4 w-4 shrink-0 text-green-500" />
                ) : (
                  <MegaphoneOff className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                )}
                <span className={cn("text-xs", c.marketing_consent ? "text-green-700 dark:text-green-400 font-medium" : "text-muted-foreground")}>
                  Kampanya bildirimi{" "}
                  {c.marketing_consent
                    ? c.marketing_consent_at
                      ? `onaylı (${format(new Date(c.marketing_consent_at), "d MMM yyyy", { locale: tr })})`
                      : "onaylı"
                    : "— onay verilmedi"}
                </span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                {c.online_booking_blocked ? (
                  <Ban className="h-4 w-4 shrink-0 text-red-500" />
                ) : (
                  <ShieldCheck className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                )}
                <span className={cn("text-xs", c.online_booking_blocked ? "text-red-600 font-medium" : "text-muted-foreground")}>
                  {c.online_booking_blocked ? "Online randevu engelli" : "Online randevu açık"}
                </span>
                <BlockOnlineBookingToggle customerId={c.id} blocked={!!c.online_booking_blocked} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card className="kpi-tile border-0 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("customerDetail.statsTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Toplam Ziyaret</p>
              <p className="font-bold text-lg tabular-nums">{c.visit_count}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Toplam Harcama</p>
              <p className="font-bold text-lg tabular-nums">₺{Number(c.total_spend).toLocaleString("tr-TR")}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Sadakat Kartı</p>
              <p className="font-bold text-lg tabular-nums">{c.loyalty_punches} / 10</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Son Ziyaret</p>
              <p className="font-medium text-sm">
                {c.last_visit_at
                  ? format(new Date(c.last_visit_at), "d MMM yyyy", { locale: tr })
                  : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tags */}
      {c.tags && c.tags.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {c.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
          ))}
        </div>
      )}

      {/* Loyalty bar */}
      <Card className="kpi-tile border-0 shadow-none">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium flex items-center gap-1.5">
              <Gift className="h-4 w-4 text-primary" /> {t("customerDetail.loyaltyTitle")}
            </span>
            <span className="text-xs text-muted-foreground">{c.loyalty_punches}/10 — {c.loyalty_redeems} kullanım</span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "flex-1 h-3 rounded-full",
                  i < c.loyalty_punches ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Appointment history */}
      <div>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4" /> {t("customerDetail.historyTitle")}
        </h2>
        <div className="space-y-2">
          {!appointments || appointments.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">{t("customerDetail.noAppointments")}</p>
          ) : (
            (appointments as (Appointment & { staff?: { full_name: string }; service?: { name: string } })[]).map((appt) => (
              <Link key={appt.id} href={`/dashboard/randevular/${appt.id}`}>
                <div className="data-row flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors">
                    <div className="text-center w-14 shrink-0">
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(appt.appointment_at), "d MMM yyyy", { locale: tr })}
                      </p>
                      <p className="text-sm font-bold text-primary tabular-nums">
                        {format(new Date(appt.appointment_at), "HH:mm")}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{appt.service?.name}</p>
                      <p className="text-xs text-muted-foreground">{appt.staff?.full_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium tabular-nums">₺{Number(appt.price).toLocaleString("tr-TR")}</p>
                      <Badge variant="outline" className="text-[10px]">
                        {t(STATUS_LABEL_KEYS[appt.status] ?? "statusTalep")}
                      </Badge>
                    </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
