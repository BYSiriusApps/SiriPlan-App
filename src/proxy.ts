import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "./lib/supabase/middleware";
import { getSubscriptionLock } from "./lib/subscription-lock";

// Routes that require at minimum "manager" role
const MANAGER_ROUTES = [
  "/dashboard/kampanyalar",
  "/dashboard/raporlar",
  "/dashboard/gelir-gider",
  "/dashboard/veri-gocu",
  "/dashboard/personel",
];

// Routes that require "owner" role
const OWNER_ROUTES = [
  "/dashboard/ayarlar",
  "/dashboard/abonelik",
];

const ROLE_RANK: Record<string, number> = { staff: 0, manager: 1, owner: 2 };
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Oturumu olmayan (anonim) istemcilerin de POST/PATCH/DELETE atabilmesi gereken
// uçlar: giriş/kayıt akışları, personel daveti kabul (henüz hesabı yok), herkese
// açık online randevu oluşturma/iptal, ve imza ile doğrulanan dış servis
// webhook'ları. Bu uçların kendi içinde (token/imza bazlı) yetki kontrolü var —
// buradaki genel "oturum yoksa 401" kuralından muaf tutulmaları gerekiyor,
// aksi halde örn. giriş isteğinin kendisi "oturum yok" diye 401'e düşer.
const PUBLIC_API_WRITE_PREFIXES = [
  "/api/auth",
  "/api/staff/invite/accept",
  "/api/appointments",
  "/api/public",
  "/api/webhooks",
];

// Deneme süresi dolan / ödemesi başarısız olan işletmeler için yazma
// işlemlerine izin verilen uç noktalar: kimlik doğrulama, ayarlar sayfası,
// abonelik/ödeme akışı ve dış servis webhook'ları.
const SUBSCRIPTION_LOCK_EXEMPT_PREFIXES = [
  "/api/auth",
  "/api/org", // ayarlar sayfasının kaydet işlemi
  "/api/stripe",
  "/api/webhooks",
  "/api/admin",
  "/api/dashboard-chat", // yardım asistanı — hesap durumu hakkında yönlendirir
];

// No URL-based locale routing — locale is stored in a cookie and read
// by next-intl's getRequestConfig (src/i18n/request.ts).
// This keeps dashboard URLs clean: /dashboard not /tr/dashboard.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.\w+$/)
  ) {
    return undefined;
  }

  // updateSession refreshes the Supabase session cookie and handles
  // basic auth redirect (/dashboard → /auth/giris if not logged in).
  const sessionResponse = await updateSession(request);

  // If updateSession already redirected (e.g. not authenticated), honour it.
  if (sessionResponse.status === 307 || sessionResponse.status === 308 || sessionResponse.status === 302) {
    return sessionResponse;
  }

  const isDashboardOrAdmin = pathname.startsWith("/dashboard") || pathname.startsWith("/admin");
  const isApiWrite = pathname.startsWith("/api/") && WRITE_METHODS.has(request.method);
  const isPublicApiWrite = isApiWrite && PUBLIC_API_WRITE_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isDashboardOrAdmin && !isApiWrite) return sessionResponse;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: () => {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    if (isPublicApiWrite) return sessionResponse;
    if (isApiWrite) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/auth/giris", request.url));
  }

  // /admin — fine-grained platform-admin check happens in the layout;
  // here we only require an authenticated user.
  if (pathname.startsWith("/admin")) return sessionResponse;

  // Aktif işletme cookie'si varsa o üyeliğin rolüne bak; yoksa ilk üyelik.
  const activeOrg = request.cookies.get("active_org")?.value;

  async function resolveMembership(select: string) {
    let query = supabase.from("org_members").select(select).eq("user_id", user!.id);
    if (activeOrg) query = query.eq("org_id", activeOrg);
    let { data: rows } = await query.limit(1);
    if ((!rows || rows.length === 0) && activeOrg) {
      // Cookie bayat (üyelik silinmiş) → ilk üyeliğe düş
      const { data: fallback } = await supabase
        .from("org_members")
        .select(select)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true })
        .limit(1);
      rows = fallback;
    }
    return rows?.[0] as Record<string, unknown> | undefined;
  }

  // Deneme süresi dolan / ödemesi başarısız olan işletmeler için yazma
  // işlemlerini API seviyesinde engelle (görüntüleme her zaman serbest).
  if (isApiWrite && !SUBSCRIPTION_LOCK_EXEMPT_PREFIXES.some((p) => pathname.startsWith(p))) {
    const member = await resolveMembership("organizations(plan, subscription_status, trial_ends_at)");
    const org = member?.organizations as
      | { plan: string; subscription_status: string; trial_ends_at: string | null }
      | undefined;
    if (org) {
      const lock = getSubscriptionLock(org);
      if (lock.locked) {
        // `error` burada kasıtlı olarak kullanıcıya gösterilecek Türkçe metin —
        // uygulamadaki toast.error() çağrılarının çoğu bu alanı doğrudan basıyor.
        return NextResponse.json(
          {
            error:
              lock.reason === "payment_failed"
                ? "Son ödemeniz alınamadı. Devam etmek için Abonelik sayfasından ödeme bilgilerinizi güncelleyin."
                : "Ücretsiz deneme süreniz doldu. Devam etmek için bir plan seçin.",
            code: "SUBSCRIPTION_LOCKED",
            reason: lock.reason,
          },
          { status: 402 }
        );
      }
    }
  }

  if (!isDashboardOrAdmin) return sessionResponse;

  // Role-based access control for dashboard routes
  const requiredRank = OWNER_ROUTES.some((r) => pathname.startsWith(r))
    ? 2
    : MANAGER_ROUTES.some((r) => pathname.startsWith(r))
    ? 1
    : 0;

  if (requiredRank > 0) {
    const member = await resolveMembership("role, org_id");
    const userRank = ROLE_RANK[(member?.role as string) ?? "staff"] ?? 0;
    if (userRank < requiredRank) {
      return NextResponse.redirect(new URL("/dashboard?forbidden=1", request.url));
    }
  }

  return sessionResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
