// Service worker mínimo: habilita instalabilidad (PWA) sin cachear de más
// (evita servir versiones viejas de la app). Deja pasar todo a la red.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  // No-op: presencia del handler para que el navegador considere la app instalable.
});
