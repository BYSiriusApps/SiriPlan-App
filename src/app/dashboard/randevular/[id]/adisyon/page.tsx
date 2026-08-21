import { createClient, getSessionUser } from "@/lib/supabase/server";
import { getActiveMember } from "@/lib/active-org";
import { redirect, notFound } from "next/navigation";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import type { Appointment, Organization } from "@/types/database";
import { PrintButton } from "./print-button";

const PAYMENT_LABELS: Record<string, string> = {
  nakit: "Nakit",
  kart: "Kredi/Banka Kartı",
  havale: "Havale/EFT",
  diger: "Diğer",
};

export default async function AdisyonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getSessionUser();
  if (!user) redirect("/auth/giris");

  const member = await getActiveMember(supabase);
  if (!member) redirect("/auth/kayit");

  const [{ data: appt, error }, { data: org }] = await Promise.all([
    supabase
      .from("appointments")
      .select("*, staff:staff!appointments_staff_id_fkey(full_name), service:services(name)")
      .eq("id", id)
      .eq("org_id", member.org_id)
      .single(),
    supabase
      .from("organizations")
      .select("name, address, city, phone, logo_url")
      .eq("id", member.org_id)
      .single(),
  ]);

  if (error || !appt) notFound();

  const a = appt as Appointment;
  const o = org as Pick<Organization, "name" | "address" | "city" | "phone" | "logo_url"> | null;
  const total = Number(a.price) + Number(a.tip || 0);

  return (
    <div className="p-6 max-w-md mx-auto space-y-4 print:p-0 print:max-w-none">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-lg font-bold">Adisyon</h1>
        <PrintButton />
      </div>

      <div className="border rounded-2xl p-6 space-y-5 bg-background print:border-0 print:rounded-none">
        <div className="text-center space-y-1">
          {o?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={o.logo_url} alt={o.name} className="h-12 mx-auto object-contain mb-2" />
          )}
          <p className="font-bold text-base">{o?.name}</p>
          {(o?.address || o?.city) && (
            <p className="text-xs text-muted-foreground">{[o?.address, o?.city].filter(Boolean).join(", ")}</p>
          )}
          {o?.phone && <p className="text-xs text-muted-foreground">{o.phone}</p>}
        </div>

        <div className="border-t border-dashed pt-4 text-sm space-y-1.5">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tarih</span>
            <span className="tabular-nums">{format(new Date(a.appointment_at), "d MMMM yyyy, HH:mm", { locale: tr })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Müşteri</span>
            <span>{a.customer_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Personel</span>
            <span>{a.staff?.full_name ?? "—"}</span>
          </div>
        </div>

        <div className="border-t border-dashed pt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground text-left">
                <th className="font-medium pb-2">Hizmet</th>
                <th className="font-medium pb-2 text-right">Tutar</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              <tr>
                <td className="py-1">{a.service?.name ?? "—"}</td>
                <td className="py-1 text-right">₺{Number(a.price).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
              </tr>
              {Number(a.tip) > 0 && (
                <tr>
                  <td className="py-1 text-muted-foreground">Bahşiş</td>
                  <td className="py-1 text-right">₺{Number(a.tip).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-dashed pt-4 flex justify-between items-center">
          <span className="font-semibold">Toplam</span>
          <span className="font-bold text-lg tabular-nums">₺{total.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
        </div>

        {a.payment_method && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Ödeme Yöntemi</span>
            <span>{PAYMENT_LABELS[a.payment_method] ?? a.payment_method}</span>
          </div>
        )}

        <p className="text-center text-[11px] text-muted-foreground pt-2">Bizi tercih ettiğiniz için teşekkür ederiz.</p>
      </div>
    </div>
  );
}
