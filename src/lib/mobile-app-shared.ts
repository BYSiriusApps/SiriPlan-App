/**
 * Native iOS/Android WebView sarmalayıcısının User-Agent'ına eklemesi gereken
 * işaretçi. App Store/Play Store paketleyen native kabuk, WebView'ının
 * User-Agent'ını varsayılana bu string'i ekleyecek şekilde ayarlamalı
 * (örn. iOS WKWebView: applicationNameForUserAgent, Android: setUserAgentString).
 * Bu, panelin fiyat/satın alma arayüzlerini native uygulamada gizlemesi için
 * tek sinyal kaynağıdır — cookie/query param kullanılmaz çünkü UA her istekte
 * (ilk yükleme dahil) sabit olarak gelir.
 *
 * Sunucu ve istemci bileşenleri arasında paylaşılabilmesi için bu dosya
 * next/headers gibi sunucuya özel importlar içermez (bkz. lib/mobile-app.ts).
 */
export const MOBILE_APP_UA_MARKER = "SiriPlanApp";

export function isMobileAppUserAgent(userAgent: string | null | undefined): boolean {
  return !!userAgent && userAgent.includes(MOBILE_APP_UA_MARKER);
}
