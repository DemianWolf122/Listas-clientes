// Atrio service worker — v7 (push + sonido + badge + echo con destinatario).
// Cambiá el número al tocar este archivo para forzar la actualización.
const SW_VERSION = "v7";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  // No-op: presencia del handler para que el navegador considere la app instalable.
});

// Responde la versión activa a la página (diagnóstico).
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "atrio-getver") {
    const port = event.ports && event.ports[0];
    if (port) port.postMessage({ type: "atrio-sw-version", version: SW_VERSION });
  }
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
    (async () => {
      // Avisar a las pestañas abiertas que llegó un push. Así la app puede sonar
      // y mostrar un cartel aunque Windows/el SO tape la notificación nativa.
      try {
        const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        for (const c of clients) {
          c.postMessage({ type: "atrio-push", at: Date.now(), title, body: options.body, url: options.data.url, recipient: data.recipient });
        }
      } catch (_) {
        /* noop */
      }
      try {
        await self.registration.showNotification(title, options);
      } catch (_) {
        // fallback mínimo si las opciones fallan en algún navegador
        await self.registration.showNotification(title, { body: options.body });
      }
    })()
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
