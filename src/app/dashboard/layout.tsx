import { getSessionUser, createClient } from "@/lib/supabase/server";
import { getActiveMember, getMemberships, isPlatformAdmin } from "@/lib/active-org";
import { getSubscriptionLock } from "@/lib/subscription-lock";
import Link from "next/link";
import { AlertTriangle, CalendarClock } from "lucide-react";
import { isMobileApp } from "@/lib/mobile-app";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileNav } from "@/components/dashboard/MobileNav";
import { HelpAssistant } from "@/components/dashboard/HelpAssistant";
import { AiAssistantProvider } from "@/components/dashboard/AiAssistantContext";
import { SubscriptionLockBanner } from "@/components/dashboard/SubscriptionLockBanner";
import { RouteTransition } from "@/components/dashboard/RouteTransition";
import { Toaster } from "@/components/ui/sonner";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  if (!user) redirect("/auth/giris");

  const member = await getActiveMember();
  const org = member?.organizations;
  const role = member?.role ?? "staff";

  if (!org) redirect("/auth/kayit");

  // Deneme süresi dolan veya ödemesi başarısız olan işletmeler paneli
  // görüntülemeye devam edebilir (redirect yok); yeni işlemler proxy.ts'te
  // API seviyesinde engellenir. Burada sadece uyarı şeridi gösterilir.
  const subscriptionLock = getSubscriptionLock(org);

  const [memberships, isAdmin, messages, mobileApp] = await Promise.all([
    getMemberships(),
    isPlatformAdmin(),
    getMessages(),
    isMobileApp(),
  ]);

  let lowStockCount = 0;
  // Randevu linkinden gelip onay bekleyen ("talep") randevular. Otomatik onay
  // artık varsayılan açık — bu sayı yalnızca salon kutuyu KAPATTIYSA > 0 olur.
  // O durumda her sayfada bir şerit gösterip onay atlanmasını önlüyoruz.
  let pendingApptCount = 0;
  if (org && (role === "owner" || role === "manager")) {
    const supabase = await createClient();
    const [{ data: inventoryItems }, { count: pendingCount }] = await Promise.all([
      supabase
        .from("inventory_items")
        .select("current_stock, min_stock_alert")
        .eq("org_id", org.id)
        .eq("is_active", true),
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("org_id", org.id)
        .eq("status", "talep"),
    ]);

    if (inventoryItems) {
      lowStockCount = inventoryItems.filter(
        (item: any) => Number(item.current_stock) <= Number(item.min_stock_alert)
      ).length;
    }
    pendingApptCount = pendingCount ?? 0;
  }

  // Deneme süresi dolan / ödemesi başarısız olan işletme, native mobil
  // uygulamada da paneli görüntülemeye devam eder (salt-okunur); yazma
  // işlemleri proxy.ts'te API seviyesinde 402 ile engellenir. Mobil uygulamada
  // uyarı şeridi mağaza kurallarına uymak için fiyat/web ödeme linki yerine
  // yalnızca müşteri destek iletişimi gösterir (bkz. SubscriptionLockBanner).
  // Daha önce burada tam ekran bir kilit vardı — kullanıcı panele hiç
  // giremiyordu; kaldırıldı.

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
              permissionsJson={member?.permissions_json}
              trialEndsAt={org.trial_ends_at ?? undefined}
              activeOrgId={org.id}
              memberships={memberships}
              isPlatformAdmin={isAdmin}
            />
          </div>

          {/* Main content — add bottom padding on mobile for nav bar */}
          <main className="dashboard-shell flex-1 overflow-auto pb-16 md:pb-0">
            {subscriptionLock.locked && subscriptionLock.reason && (
              <SubscriptionLockBanner reason={subscriptionLock.reason} mobileApp={mobileApp} />
            )}
            {pendingApptCount > 0 && (
              <div className="bg-rose-600 hover:bg-rose-700 transition-colors text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between gap-4 border-b border-rose-700">
                <span className="flex items-center gap-1.5">
                  <CalendarClock className="h-4 w-4 shrink-0" />
                  {pendingApptCount} randevu onayınızı bekliyor — randevu linkinden geldi.
                </span>
                <Link
                  href="/dashboard/bekleme-listesi"
                  className="underline hover:text-rose-100 transition-colors shrink-0 font-bold"
                >
                  Onayla →
                </Link>
              </div>
            )}
            {lowStockCount > 0 && (
              <div className="bg-amber-500 hover:bg-amber-600 transition-colors text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between gap-4 border-b border-amber-600">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Kritik Stok Uyarısı: {lowStockCount} adet ürünün stoku belirlenen kritik seviyenin altına düşmüştür!
                </span>
                <Link
                  href="/dashboard/stok"
                  className="underline hover:text-amber-100 transition-colors shrink-0 font-bold"
                >
                  Stok Yönetimine Git →
                </Link>
              </div>
            )}
            <RouteTransition>{children}</RouteTransition>
          </main>

          {/* Mobile bottom navigation */}
          <div className="print:hidden">
            <MobileNav role={role} permissionsJson={member?.permissions_json} orgSlug={org.slug} plan={org.plan} />
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
