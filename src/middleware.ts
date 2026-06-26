import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { updateSession } from "./lib/supabase/middleware";

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip for static assets and Next.js internals
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.\w+$/)
  ) {
    return NextResponse.next();
  }

  // API routes: only update Supabase session
  if (pathname.startsWith("/api/")) {
    return updateSession(request);
  }

  // For all other routes: update Supabase session first, then apply i18n
  const sessionResponse = await updateSession(request);
  if (sessionResponse.status !== 200 || sessionResponse.headers.get("location")) {
    return sessionResponse;
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
