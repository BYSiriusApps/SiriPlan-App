import { getActiveMember } from "@/lib/active-org";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { HomeButton } from "@/components/dashboard/HomeButton";
import { AccountProfileForm } from "@/components/dashboard/AccountProfileForm";

export default async function HesabimPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/giris");

  const member = await getActiveMember();
  if (!member) redirect("/auth/kayit");

  const t = await getTranslations("dashboard.account");

  // Kendi staff satırı (varsa). `staff` SELECT'i kendi org'u için RLS ile açık.
  let staffRow: {
    full_name?: string | null;
    phone?: string | null;
    address?: string | null;
    preferred_language?: string | null;
  } | null = null;

  if (member.staff_id) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("staff")
      .select("full_name, phone, address, preferred_language")
      .eq("id", member.staff_id)
      .maybeSingle();
    staffRow = data ?? null;
  }

  const initial = {
    full_name:
      staffRow?.full_name ||
      (user.user_metadata?.full_name as string | undefined) ||
      user.email?.split("@")[0] ||
      "",
    phone: staffRow?.phone || "",
    address: staffRow?.address || "",
    preferred_language:
      staffRow?.preferred_language ||
      (user.user_metadata?.locale as string | undefined) ||
      "tr",
  };

  return (
    <div className="px-4 pt-6 pb-24 max-w-2xl mx-auto space-y-4">
      <header className="flex items-start justify-between gap-3 pb-1">
        <div className="min-w-0">
          <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/70 block">
            {t("eyebrow")}
          </span>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold brand-gradient-text leading-tight">{t("title")}</h1>
            <HomeButton />
          </div>
          <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>
      </header>

      <AccountProfileForm
        initial={initial}
        role={member.role}
        orgName={member.organizations?.name ?? "—"}
        email={user.email ?? "—"}
        permissionsJson={member.permissions_json}
      />
    </div>
  );
}
