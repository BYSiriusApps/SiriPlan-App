import { cookies, headers } from "next/headers";
import { isMobileAppUserAgent, isMobileAppCookieValue, MOBILE_APP_COOKIE } from "./mobile-app-shared";

export { MOBILE_APP_UA_MARKER, MOBILE_APP_COOKIE, isMobileAppUserAgent } from "./mobile-app-shared";

/**
 * Server component / route handler içinde native uygulama içinden mi
 * geldiğini kontrol eder. iOS için UA işaretçisine, Android için proxy.ts'nin
 * TWA referer'ından set ettiği cookie'ye bakar (bkz. mobile-app-shared.ts).
 */
export async function isMobileApp(): Promise<boolean> {
  const [h, c] = await Promise.all([headers(), cookies()]);
  if (isMobileAppUserAgent(h.get("user-agent"))) return true;
  return isMobileAppCookieValue(c.get(MOBILE_APP_COOKIE)?.value);
}
