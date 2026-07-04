import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "./lib/supabase/middleware";

// Routes that require at minimum "manager" role
const MANAGER_ROUTES = [
  "/dashboard/kampanyalar",
  "/dashboard/raporlar",
  "/dashboard/gelir-gider",
  "/dashboard/veri-gocu",
];

// Routes that require "owner" role
const OWNER_ROUTES = [
  "/dashboard/ayarlar",
  "/dashboard/abonelik",
  "/dashboard/personel/yeni",
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

  // Role-based access control for dashboard routes
  if (pathname.startsWith("/dashboard")) {
    const requiredRank = OWNER_ROUTES.some((r) => pathname.startsWith(r))
      ? 2
      : MANAGER_ROUTES.some((r) => pathname.startsWith(r))
      ? 1
      : 0;

    if (requiredRank > 0) {
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
      if (user) {
        const { data: member } = await supabase
          .from("org_members")
          .select("role")
          .eq("user_id", user.id)
          .single();

        const userRank = ROLE_RANK[member?.role ?? "staff"] ?? 0;
        if (userRank < requiredRank) {
          return NextResponse.redirect(new URL("/dashboard?forbidden=1", request.url));
        }
      }
    }
  }

  return sessionResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
