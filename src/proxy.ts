import { type NextRequest } from "next/server";
import { updateSession } from "./lib/supabase/middleware";

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

  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
