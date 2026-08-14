/**
 * Native iOS WebView sarmalayıcısının User-Agent'ına eklemesi gereken işaretçi
 * (WKWebView: customUserAgent/applicationNameForUserAgent — PWABuilder iOS
 * paketi indirildikten sonra Xcode projesine elle eklenir).
 *
 * Android'de bu işe yaramaz: PWABuilder'ın ürettiği paket bir Trusted Web
 * Activity (TWA) olup gerçek Chrome'u başlatır — Chrome'un gönderdiği
 * User-Agent native tarafından değiştirilemez. Android tarafı bu yüzden
 * MOBILE_APP_COOKIE'ye dayanır: TWA ilk açıldığında Chrome, isteğe
 * `Referer: android-app://<paket-adı>` header'ı ekler (TWA'ya özgü, Google
 * tarafından dokümante edilmiş davranış); proxy.ts bunu yakalayıp kalıcı bir
 * cookie'ye çevirir, böylece sonraki tüm gezinmelerde (referer artık
 * gelmese de) sinyal korunur.
 *
 * Sunucu ve istemci bileşenleri arasında paylaşılabilmesi için bu dosya
 * next/headers gibi sunucuya özel importlar içermez (bkz. lib/mobile-app.ts).
 */
export const MOBILE_APP_UA_MARKER = "SiriPlanApp";

/** Android TWA tespiti sonrası proxy.ts'nin set ettiği kalıcı cookie adı. */
export const MOBILE_APP_COOKIE = "sp_app";

export function isMobileAppUserAgent(userAgent: string | null | undefined): boolean {
  return !!userAgent && userAgent.includes(MOBILE_APP_UA_MARKER);
}

export function isMobileAppCookieValue(cookieValue: string | null | undefined): boolean {
  return cookieValue === "1";
}

/** document.cookie string'i içinde MOBILE_APP_COOKIE var mı diye bakar (istemci tarafı). */
export function hasMobileAppCookie(documentCookie: string): boolean {
  return documentCookie
    .split("; ")
    .some((pair) => {
      const [name, value] = pair.split("=");
      return name === MOBILE_APP_COOKIE && isMobileAppCookieValue(value);
    });
}
