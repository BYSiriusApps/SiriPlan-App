import { createClient } from "@/lib/supabase/server";
import { getActiveMember, getMemberships, isPlatformAdmin } from "@/lib/active-org";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileNav } from "@/components/dashboard/MobileNav";
import { Toaster } from "@/components/ui/sonner";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/giris");

  const member = await getActiveMember(supabase);
  const org = member?.organizations;
  const role = member?.role ?? "staff";

  if (!org) redirect("/auth/kayit");

  if (org.plan === "trial" && org.trial_ends_at) {
    const trialEnd = new Date(org.trial_ends_at);
    if (trialEnd < new Date()) {
      redirect("/auth/plan-sec?expired=1");
    }
  }

  const [memberships, isAdmin, messages] = await Promise.all([
    getMemberships(supabase),
    isPlatformAdmin(supabase),
    getMessages(),
  ]);

  return (
    <NextIntlClientProvider messages={messages}>
      <div className="flex min-h-screen bg-background">
        {/* Desktop sidebar — hidden on mobile */}
        <div className="hidden md:flex">
          <Sidebar
            orgName={org.name}
            plan={org.plan}
            role={role}
            trialEndsAt={org.trial_ends_at ?? undefined}
            activeOrgId={org.id}
            memberships={memberships}
            isPlatformAdmin={isAdmin}
          />
        </div>

        {/* Main content — add bottom padding on mobile for nav bar */}
        <main className="dashboard-shell flex-1 overflow-auto pb-16 md:pb-0">
          {children}
        </main>

        {/* Mobile bottom navigation */}
        <MobileNav role={role} />

        <Toaster position="top-right" richColors />
      </div>
    </NextIntlClientProvider>
  );
}
