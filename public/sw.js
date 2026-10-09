// Minimal service worker — PWA kurulabilirlik kriterini (fetch handler'lı kayıtlı
// bir service worker) karşılar ve Web Push bildirimlerini gösterir. Kasıtlı olarak
// hiçbir isteği önbelleğe almıyor/durdurmuyor; tarayıcı normal ağ davranışına devam eder.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {});

// ─── Web Push ───────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = typeof data.title === "string" && data.title ? data.title : "SiriusPlan";
  const options = {
    body: typeof data.body === "string" ? data.body : "",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    tag: typeof data.tag === "string" ? data.tag : undefined,
    data: { url: typeof data.url === "string" ? data.url : "/dashboard" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  // Yalnızca aynı-origin göreli yol açılır.
  let path = (event.notification.data && event.notification.data.url) || "/dashboard";
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//")) path = "/dashboard";
  const target = new URL(path, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.startsWith(self.location.origin) && "focus" in c) {
          return c.focus().then((f) => (f && "navigate" in f ? f.navigate(target) : undefined));
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
