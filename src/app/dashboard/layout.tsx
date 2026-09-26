import { getSessionUser, createClient } from "@/lib/supabase/server";
import { getActiveMember, getMemberships, isPlatformAdmin } from "@/lib/active-org";
import { getSubscriptionLock } from "@/lib/subscription-lock";
import { hasProTools } from "@/lib/entitlements";
import { PlanProvider } from "@/components/dashboard/PlanContext";
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
import { LiveNotifications } from "@/components/dashboard/LiveNotifications";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

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

  // Bu iki grup birbirine bağımlı değil (ikisi de yalnızca org.id'ye ihtiyaç
  // duyar) — eskiden ayrı ayrı Promise.all() ile sıralı (2 ağ turu) yapılıyordu,
  // her panel sayfası geçişinde bir tam gidiş-dönüş süresi fazladan bekletiyordu.
  // Tek dalgada paralel çalıştırıyoruz.
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const [memberships, isAdmin, messages, mobileApp, { data: inventoryItems }, { count: talepCount }, { count: requestCount }, { count: missingPhoneCount }, { data: overdueRaw }] =
    await Promise.all([
      getMemberships(),
      isPlatformAdmin(),
      getMessages(),
      isMobileApp(),
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
      supabase
        .from("appointment_requests")
        .select("id", { count: "exact", head: true })
        .eq("org_id", org.id)
        .eq("status", "pending"),
      // Sesli/hızlı randevuda telefon bilinmeden oluşturulmuş kayıtlar — müşteriye
      // WhatsApp bilgilendirmesi gitmedi, personel numarayı öğrenince tamamlamalı.
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("org_id", org.id)
        .eq("customer_phone", "")
        .neq("status", "iptal"),
      // Randevu saati (+ süresi) geçmiş ama hâlâ "Onaylandı" kalmış, sonuçlandırılmamış
      // randevular — Bekleyen İstekler sayfasında ayrı listelenir ama sayaca hiç
      // dahil edilmiyordu (bkz. bekleyen-istekler/page.tsx overdueAppointments).
      supabase
        .from("appointments")
        .select("appointment_at, duration_minutes")
        .eq("org_id", org.id)
        .eq("status", "onaylandi")
        .lt("appointment_at", nowIso)
        .limit(500),
    ]);

  let lowStockCount = 0;
  if (inventoryItems) {
    lowStockCount = inventoryItems.filter(
      (item: any) => Number(item.min_stock_alert) > 0 && Number(item.current_stock) <= Number(item.min_stock_alert)
    ).length;
  }
  const nowMs = new Date(nowIso).getTime();
  const overdueCount = (overdueRaw ?? []).filter(
    (a: { appointment_at: string; duration_minutes: number | null }) =>
      new Date(a.appointment_at).getTime() + Number(a.duration_minutes || 0) * 60_000 < nowMs
  ).length;
  // Onay bekleyen randevular: randevu linkinden gelip otomatik onay kapalıyken
  // "talep" durumuna düşenler (talepCount) + WhatsApp/Instagram/web üzerinden
  // gelen appointment_requests (requestCount). Eskiden yalnızca talepCount
  // sayılıyordu — WhatsApp/Instagram'dan gelen bir talep varken şerit "1"
  // gösterip gerçekte 2 randevu onay bekliyorsa kullanıcıyı yanıltıyordu.
  const pendingApprovalsCount = (talepCount ?? 0) + (requestCount ?? 0);
  const pendingApptCount = role === "owner" || role === "manager" ? pendingApprovalsCount : 0;
  // Sidebar/mobil menüde "Bekleyen İşler" yanındaki sayaç — WhatsApp/Instagram/
  // link üzerinden gelen talepler + kritik stok. Tüm roller görsün diye (staff
  // dahil) role kısıtı YOK; yalnızca yukarıdaki tam genişlik şeritler owner/
  // manager'a özel kalıyor. talepCount (randevu linkinden gelen, otomatik onay
  // kapalıyken oluşan) artık "Bekleyen İstekler" sayfasında da listelendiği
  // için sayaca dahil edildi — önceden yalnızca üstteki kırmızı şeritte
  // sayılıyordu, sayfada görünmeden sayaç da eksik kalıyordu. overdueCount
  // (randevu saati geçmiş ama hâlâ "Onaylandı" kalmış, sonuçlandırılmamış
  // randevular) da aynı sebeple eksikti — sayfada listeleniyordu ama sayaca
  // hiç yansımıyordu (örn. 4 stok + 2 talep + 3 sonuçlandırılmamış = 9 yerine 6).
  const pendingWorkCount = lowStockCount + (requestCount ?? 0) + (missingPhoneCount ?? 0) + (talepCount ?? 0) + overdueCount;

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
              pendingWorkCount={pendingWorkCount}
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
                  {pendingApptCount} randevu onayınızı bekliyor — randevu linki, WhatsApp veya Instagram üzerinden geldi.
                </span>
                <Link
                  href="/dashboard/bekleyen-istekler"
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
            <MobileNav role={role} permissionsJson={member?.permissions_json} orgSlug={org.slug} plan={org.plan} pendingWorkCount={pendingWorkCount} pendingApptCount={pendingApprovalsCount} />
          </div>

          <div className="print:hidden">
            <HelpAssistant />
          </div>

          <Toaster position="top-right" richColors />
          <LiveNotifications orgId={org.id} />
        </div>
      </AiAssistantProvider>
     </PlanProvider>
    </NextIntlClientProvider>
  );
}
