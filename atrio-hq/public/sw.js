// Atrio service worker — v3 (push). Cambiá el número al tocar este archivo
// para forzar la actualización en los dispositivos.
const SW_VERSION = "v3";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  // No-op: presencia del handler para que el navegador considere la app instalable.
});

// --- Web Push ---
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { title: "Atrio", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Atrio";
  const options = {
    body: data.body || "",
    icon: "/icon",
    badge: "/icon",
    tag: data.tag || undefined,
    data: { url: data.url || "/" },
  };
  event.waitUntil(
    self.registration.showNotification(title, options).catch(() =>
      // fallback mínimo si las opciones fallan en algún navegador
      self.registration.showNotification(title, { body: options.body })
    )
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
