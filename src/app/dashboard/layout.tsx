import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileNav } from "@/components/dashboard/MobileNav";
import { Toaster } from "@/components/ui/sonner";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/giris");

  const { data: member } = await supabase
    .from("org_members")
    .select("role, organizations(id, name, plan, subscription_status, trial_ends_at)")
    .eq("user_id", user.id)
    .single();

  const org = (member as { role: string; organizations: { id: string; name: string; plan: string; subscription_status: string; trial_ends_at?: string } } | null)?.organizations;

  if (!org) redirect("/auth/kayit");

  if (org.plan === "trial" && org.trial_ends_at) {
    const trialEnd = new Date(org.trial_ends_at);
    if (trialEnd < new Date()) {
      redirect("/auth/plan-sec?expired=1");
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:flex">
        <Sidebar orgName={org.name} plan={org.plan} />
      </div>

      {/* Main content — add bottom padding on mobile for nav bar */}
      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        {children}
      </main>

      {/* Mobile bottom navigation */}
      <MobileNav />

      <Toaster position="top-right" richColors />
    </div>
  );
}
