import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "./lib/supabase/middleware";

// Routes that require at minimum "manager" role
const MANAGER_ROUTES = [
  "/dashboard/kampanyalar",
  "/dashboard/raporlar",
  "/dashboard/gelir-gider",
  "/dashboard/veri-gocu",
  "/dashboard/personel/yeni",
];

// Routes that require "owner" role
const OWNER_ROUTES = [
  "/dashboard/ayarlar",
  "/dashboard/abonelik",
];

const ROLE_RANK: Record<string, number> = { staff: 0, manager: 1, owner: 2 };

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

  const needsAuthCheck = pathname.startsWith("/dashboard") || pathname.startsWith("/admin");
  if (!needsAuthCheck) return sessionResponse;

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
    return NextResponse.redirect(new URL("/auth/giris", request.url));
  }

  // /admin — fine-grained platform-admin check happens in the layout;
  // here we only require an authenticated user.
  if (pathname.startsWith("/admin")) return sessionResponse;

  // Role-based access control for dashboard routes
  const requiredRank = OWNER_ROUTES.some((r) => pathname.startsWith(r))
    ? 2
    : MANAGER_ROUTES.some((r) => pathname.startsWith(r))
    ? 1
    : 0;

  if (requiredRank > 0) {
    // Aktif işletme cookie'si varsa o üyeliğin rolüne bak; yoksa ilk üyelik.
    const activeOrg = request.cookies.get("active_org")?.value;
    let query = supabase
      .from("org_members")
      .select("role, org_id")
      .eq("user_id", user.id);
    if (activeOrg) query = query.eq("org_id", activeOrg);

    let { data: members } = await query.limit(1);
    if ((!members || members.length === 0) && activeOrg) {
      // Cookie bayat (üyelik silinmiş) → ilk üyeliğe düş
      const { data: fallback } = await supabase
        .from("org_members")
        .select("role, org_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1);
      members = fallback;
    }

    const userRank = ROLE_RANK[members?.[0]?.role ?? "staff"] ?? 0;
    if (userRank < requiredRank) {
      return NextResponse.redirect(new URL("/dashboard?forbidden=1", request.url));
    }
  }

  return sessionResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
