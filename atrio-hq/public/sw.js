// Atrio service worker — v5 (push + sonido + badge). Cambiá el número al tocar
// este archivo para forzar la actualización en los dispositivos.
const SW_VERSION = "v5";

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
    icon: data.icon || "/icon",
    badge: data.badge || "/badge",
    tag: data.tag || undefined,
    // sonido/vibración: silent:false fuerza el sonido del sistema; renotify
    // hace que cada aviso vuelva a sonar aunque comparta tag.
    silent: false,
    renotify: !!data.tag,
    vibrate: [180, 90, 180],
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
