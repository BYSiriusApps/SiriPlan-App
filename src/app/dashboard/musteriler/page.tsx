import { createClient } from "@/lib/supabase/server";
import { getActiveMember } from "@/lib/active-org";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Customer } from "@/types/database";
import { CustomerList } from "@/components/dashboard/CustomerList";
import { HomeButton } from "@/components/dashboard/HomeButton";

export default async function MusterilerPage({
  searchParams,
}: {
  searchParams: Promise<{ kampanya?: string }>;
}) {
  const params = await searchParams;
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
            <h1 className="text-2xl font-bold">Müşteriler</h1>
            <p className="text-muted-foreground text-sm">{customers?.length || 0} müşteri</p>
          </div>
          <HomeButton />
        </div>
        <Link
          href="/dashboard/musteriler/yeni"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + Müşteri Ekle
        </Link>
      </div>

      <CustomerList
        customers={(customers ?? []) as Customer[]}
        showPhoneButtons={showPhoneButtons}
        initialKampanya={params.kampanya === "1"}
      />
    </div>
  );
}
