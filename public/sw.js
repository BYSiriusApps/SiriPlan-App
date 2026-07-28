// Minimal service worker — sadece PWA kurulabilirlik kriterini (fetch handler'lı
// kayıtlı bir service worker) karşılamak için var. Kasıtlı olarak hiçbir isteği
// önbelleğe almıyor/durdurmuyor; tarayıcı normal ağ davranışına devam eder.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {});
