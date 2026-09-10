import { createClient, getSessionUser } from "@/lib/supabase/server";
import { getActiveMember } from "@/lib/active-org";
import { redirect, notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { format } from "date-fns";
import { tr, enUS, ru, ar } from "date-fns/locale";

const DATE_FNS_LOCALES = { tr, en: enUS, ru, ar } as const;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft, Phone, User, Scissors, Clock, CreditCard, Pencil, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/types/database";
import ApptActions from "./appt-actions";
import { STATUS_LABEL_KEYS, STATUS_BADGE_CLASSES } from "@/lib/appointment-status";

export default async function ApptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("dashboard");
  const locale = await getLocale();
  const dateFnsLocale = DATE_FNS_LOCALES[locale as keyof typeof DATE_FNS_LOCALES] ?? tr;
  const supabase = await createClient();
  const user = await getSessionUser();
  if (!user) redirect("/auth/giris");

  const member = await getActiveMember(supabase);
  if (!member) redirect("/auth/kayit");

  const { data: appt, error } = await supabase
    .from("appointments")
    .select("*, staff:staff!appointments_staff_id_fkey(*), service:services(*), customer:customers(*)")
    .eq("id", id)
    .eq("org_id", member.org_id)
    .single();

  if (error || !appt) notFound();

  const a = appt as Appointment;

  // Paketten düşme: müşterinin bu hizmet için (ya da hizmete bağlı olmayan)
  // kullanılabilir aktif paketi varsa tamamlama formunda kutu çıkar.
  let activePackage: { id: string; name: string; remaining: number } | null = null;
  const apptDone = a.status === "tamamlandi" || a.status === "iptal" || a.status === "gelmedi";
  if (a.customer_id && !apptDone) {
    const { data: pkgs } = await supabase
      .from("customer_packages")
      .select("id, name, total_sessions, used_sessions, service_id, expires_at")
      .eq("org_id", member.org_id)
      .eq("customer_id", a.customer_id)
      .eq("status", "active");
    const today = new Date().toISOString().slice(0, 10);
    const usable = (pkgs ?? [])
      .filter(
        (p) =>
          (p.service_id === a.service_id || p.service_id === null) &&
          p.total_sessions - p.used_sessions > 0 &&
          (!p.expires_at || p.expires_at >= today),
      )
      .sort((x, _y) => (x.service_id === a.service_id ? -1 : 1))
      .map((p) => ({ id: p.id, name: p.name, remaining: p.total_sessions - p.used_sessions }));
    activePackage = usable[0] ?? (a.package_id ? usable.find((u) => u.id === a.package_id) ?? null : null);
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/randevular" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold brand-gradient-text">{t("apptDetail.title")}</h1>
        <Badge variant="outline" className={cn("ml-auto", STATUS_BADGE_CLASSES[a.status])}>
          {t(STATUS_LABEL_KEYS[a.status])}
        </Badge>
        <Link
          href={`/dashboard/randevular/${id}/adisyon`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <Receipt className="h-3.5 w-3.5" />
          Adisyon
        </Link>
        {a.status !== "tamamlandi" && a.status !== "iptal" && a.status !== "gelmedi" && (
          <Link
            href={`/dashboard/randevular/${id}/duzenle`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
            {t("apptDetail.editButton")}
          </Link>
        )}
      </div>

      {/* Main info */}
      <Card className="kpi-tile border-0 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {format(new Date(a.appointment_at), "d MMMM yyyy, EEEE — HH:mm", { locale: dateFnsLocale })}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground text-xs">Müşteri</p>
              <p className="font-medium">{a.customer_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground text-xs">Telefon</p>
              <a href={`tel:${a.customer_phone}`} className="font-medium text-primary hover:underline">
                {a.customer_phone}
              </a>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Scissors className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground text-xs">Hizmet</p>
              <p className="font-medium">{a.service?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground text-xs">Personel</p>
              <p className="font-medium">{a.staff?.full_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground text-xs">Süre</p>
              <p className="font-medium">{a.duration_minutes} dk</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground text-xs">Ücret</p>
              <p className="font-medium">₺{Number(a.price).toLocaleString("tr-TR")}</p>
            </div>
          </div>
          {a.tip > 0 && (
            <div className="col-span-2">
              <p className="text-muted-foreground text-xs">Bahşiş</p>
              <p className="font-medium">₺{Number(a.tip).toLocaleString("tr-TR")}</p>
            </div>
          )}
          {a.payment_method && (
            <div>
              <p className="text-muted-foreground text-xs">Ödeme Yöntemi</p>
              <p className="font-medium capitalize">
                {a.payment_method === "paket" ? "Paketten düşüldü 🎟️" : a.payment_method}
              </p>
            </div>
          )}
          {a.source && (
            <div>
              <p className="text-muted-foreground text-xs">Kaynak</p>
              <p className="font-medium capitalize">{a.source}</p>
            </div>
          )}
          {a.note && (
            <div className="col-span-2">
              <p className="text-muted-foreground text-xs">Müşteri Notu</p>
              <p className="font-medium">{a.note}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer history link */}
      {a.customer_id && (
        <Link
          href={`/dashboard/musteriler/${a.customer_id}`}
          className="block text-sm text-primary hover:underline"
        >
          {t("apptDetail.customerHistoryLink")} →
        </Link>
      )}

      {/* Actions */}
      <ApptActions appt={a} viewerRole={member.role} viewerStaffId={member.staff_id} activePackage={activePackage} />
    </div>
  );
}
