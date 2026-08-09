import { headers } from "next/headers";
import { isMobileAppUserAgent } from "./mobile-app-shared";

export { MOBILE_APP_UA_MARKER, isMobileAppUserAgent } from "./mobile-app-shared";

/** Server component / route handler içinde native uygulama içinden mi geldiğini kontrol eder. */
export async function isMobileApp(): Promise<boolean> {
  const h = await headers();
  return isMobileAppUserAgent(h.get("user-agent"));
}
