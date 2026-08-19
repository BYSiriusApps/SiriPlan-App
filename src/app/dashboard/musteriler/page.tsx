import { createClient } from "@/lib/supabase/server";
import { getActiveMember } from "@/lib/active-org";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Customer } from "@/types/database";
import { CustomerList } from "@/components/dashboard/CustomerList";
import { HomeButton } from "@/components/dashboard/HomeButton";
import { hasPermission } from "@/lib/permissions";

export default async function MusterilerPage({
  searchParams,
}: {
  searchParams: Promise<{ kampanya?: string }>;
}) {
  const params = await searchParams;
  const t = await getTranslations("dashboard");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/giris");

  const member = await getActiveMember(supabase);
  if (!member) redirect("/auth/kayit");

  type MemberWithOrg = { org_id: string; role: string; organizations: { settings_json: Record<string, unknown> | null } | null };
  const m = member as unknown as MemberWithOrg;
  const settings = (m.organizations?.settings_json ?? {}) as Record<string, unknown>;
  const staffPhoneAccess = "staff_phone_access" in settings ? !!settings.staff_phone_access : true;
  const showPhoneButtons = m.role !== "staff" || staffPhoneAccess;
  // Silme butonu yalnızca yetkisi olanlara çizilir; asıl denetim
  // DELETE /api/customers/[id] içinde tekrar yapılır (bkz. lib/permissions).
  const canDelete = hasPermission(member, "delete_customers");

  // Tüm liste tek seferde gelir; arama/sıralama istemcide anında yapılır.
  const { data: customers } = await supabase
    .from("customers")
    .select("*")
    .eq("org_id", member.org_id)
    .order("last_visit_at", { ascending: false, nullsFirst: false })
    .limit(500);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/70">CRM</span>
            <h1 className="text-2xl md:text-3xl font-bold brand-gradient-text leading-tight">{t("customers")}</h1>
            <p className="text-muted-foreground text-sm">{t("customerCountLabel", { count: customers?.length || 0 })}</p>
          </div>
          <HomeButton />
        </div>
        <Link
          href="/dashboard/musteriler/yeni"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          {t("addCustomer")}
        </Link>
      </div>

      <CustomerList
        customers={(customers ?? []) as Customer[]}
        showPhoneButtons={showPhoneButtons}
        initialKampanya={params.kampanya === "1"}
        canDelete={canDelete}
      />
    </div>
  );
}
