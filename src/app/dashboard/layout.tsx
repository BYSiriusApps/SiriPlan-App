import { createClient } from "@/lib/supabase/server";
import { getActiveMember, getMemberships, isPlatformAdmin } from "@/lib/active-org";
import { getSubscriptionLock } from "@/lib/subscription-lock";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileNav } from "@/components/dashboard/MobileNav";
import { HelpAssistant } from "@/components/dashboard/HelpAssistant";
import { AiAssistantProvider } from "@/components/dashboard/AiAssistantContext";
import { SubscriptionLockBanner } from "@/components/dashboard/SubscriptionLockBanner";
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

  // Deneme süresi dolan veya ödemesi başarısız olan işletmeler paneli
  // görüntülemeye devam edebilir (redirect yok); yeni işlemler proxy.ts'te
  // API seviyesinde engellenir. Burada sadece uyarı şeridi gösterilir.
  const subscriptionLock = getSubscriptionLock(org);

  const [memberships, isAdmin, messages] = await Promise.all([
    getMemberships(supabase),
    isPlatformAdmin(supabase),
    getMessages(),
  ]);

  return (
    <NextIntlClientProvider messages={messages}>
      <AiAssistantProvider>
        <div className="flex min-h-screen bg-background">
          {/* Desktop sidebar — hidden on mobile and when printing (adisyon vb.) */}
          <div className="hidden md:flex print:hidden">
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
            {subscriptionLock.locked && subscriptionLock.reason && (
              <SubscriptionLockBanner reason={subscriptionLock.reason} />
            )}
            {children}
          </main>

          {/* Mobile bottom navigation */}
          <div className="print:hidden">
            <MobileNav role={role} orgSlug={org.slug} />
          </div>

          <div className="print:hidden">
            <HelpAssistant />
          </div>

          <Toaster position="top-right" richColors />
        </div>
      </AiAssistantProvider>
    </NextIntlClientProvider>
  );
}
