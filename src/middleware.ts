import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";

// Manager olmadan erişilemeyen rotalar
const MANAGER_ROUTES = [
  "/dashboard/kampanyalar",
  "/dashboard/raporlar",
  "/dashboard/gelir-gider",
  "/dashboard/veri-gocu",
];

// Sadece owner erişebilir
const OWNER_ROUTES = [
  "/dashboard/ayarlar",
  "/dashboard/abonelik",
  "/dashboard/personel/yeni",
];

const ROLE_RANK: Record<string, number> = { staff: 0, manager: 1, owner: 2 };

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/auth/giris", req.url));
  }

  const requiredRank = OWNER_ROUTES.some((r) => pathname.startsWith(r))
    ? 2
    : MANAGER_ROUTES.some((r) => pathname.startsWith(r))
    ? 1
    : 0;

  if (requiredRank === 0) return res;

  const { data: member } = await supabase
    .from("org_members")
    .select("role")
    .eq("user_id", user.id)
    .single();

  const userRank = ROLE_RANK[member?.role ?? "staff"] ?? 0;

  if (userRank < requiredRank) {
    return NextResponse.redirect(new URL("/dashboard?forbidden=1", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
