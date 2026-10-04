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

/**
 * Kaydın/isteğin geldiği native platform. iOS: UA işaretçisi + iPhone/iPad/iPod;
 * Android (TWA): sp_app çerezi + Android UA. Native değilse null (web).
 */
export async function getMobileAppPlatform(): Promise<"ios" | "android" | null> {
  const [h, c] = await Promise.all([headers(), cookies()]);
  const ua = h.get("user-agent") ?? "";
  if (isMobileAppUserAgent(ua) && /iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (isMobileAppUserAgent(ua) || isMobileAppCookieValue(c.get(MOBILE_APP_COOKIE)?.value)) {
    return /Android/i.test(ua) ? "android" : "ios";
  }
  return null;
}
