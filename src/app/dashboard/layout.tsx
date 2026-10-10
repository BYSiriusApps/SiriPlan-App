import { getSessionUser } from "@/lib/supabase/server";
import { getActiveMember, getMemberships, isPlatformAdmin } from "@/lib/active-org";
import { getSubscriptionLock } from "@/lib/subscription-lock";
import { hasProTools } from "@/lib/entitlements";
import { PlanProvider } from "@/components/dashboard/PlanContext";
import { isMobileApp } from "@/lib/mobile-app";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileNav } from "@/components/dashboard/MobileNav";
import { HelpAssistant } from "@/components/dashboard/HelpAssistantLazy";
import { AiAssistantProvider } from "@/components/dashboard/AiAssistantContext";
import { DashboardBadgeProvider } from "@/components/dashboard/DashboardBadgeContext";
import { DashboardBanners } from "@/components/dashboard/DashboardBanners";
import { SubscriptionLockBanner } from "@/components/dashboard/SubscriptionLockBanner";
import { RouteTransition } from "@/components/dashboard/RouteTransition";
import { Toaster } from "@/components/ui/sonner";
import { LiveNotifications } from "@/components/dashboard/LiveNotifications";
import { PushPrompt } from "@/components/dashboard/PushPrompt";
import { NativePushBridge } from "@/components/dashboard/NativePushBridge";
import { OfferChoiceHost } from "@/components/dashboard/OfferChoiceHost";
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

  // Bu üç grup birbirine bağımlı değil (hepsi yalnızca org.id'ye ihtiyaç duyar)
  // — paralel çalıştırılıyor. Kritik stok/onay bekleyen randevu SAYIMLARI
  // (eskiden burada 5 ayrı sorguydu) artık burada YOK — DashboardBadgeContext
  // üzerinden istemci tarafında, 20 sn önbellekli olarak ayrıca çekiliyor
  // (bkz. lib/dashboard-badges.ts). Sebep: bu sayılar yalnızca Sidebar/
  // MobileNav rozetleri ve üstteki uyarı şeritleri için kullanılıyordu ama
  // TÜM sayfa render'ını (asıl istenen takvim/randevu içeriği dahil)
  // bekletiyordu — panel her sayfa geçişinde gereksiz ~1-2 sn TTFB'ye mal
  // oluyordu. Hesap mantığı birebir aynı, yalnızca taşındı.
  const [memberships, isAdmin, messages, mobileApp] = await Promise.all([
    getMemberships(),
    isPlatformAdmin(),
    getMessages(),
    isMobileApp(),
  ]);

  // Deneme süresi dolan / ödemesi başarısız olan işletme, native mobil
  // uygulamada da paneli görüntülemeye devam eder (salt-okunur); yazma
  // işlemleri proxy.ts'te API seviyesinde 402 ile engellenir. Mobil uygulamada
  // uyarı şeridi mağaza kurallarına uymak için fiyat/web ödeme linki yerine
  // yalnızca müşteri destek iletişimi gösterir (bkz. SubscriptionLockBanner).
  // Daha önce burada tam ekran bir kilit vardı — kullanıcı panele hiç
  // giremiyordu; kaldırıldı.

  return (
    <NextIntlClientProvider messages={messages}>
     <PlanProvider value={{ plan: org.plan, proTools: hasProTools(org) }}>
      <AiAssistantProvider>
       <DashboardBadgeProvider>
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
            <DashboardBanners role={role} />
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
          <LiveNotifications orgId={org.id} />
          <PushPrompt />
          <NativePushBridge />
          <OfferChoiceHost />
        </div>
       </DashboardBadgeProvider>
      </AiAssistantProvider>
     </PlanProvider>
    </NextIntlClientProvider>
  );
}
