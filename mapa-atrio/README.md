# atrıo · Mapa de Ruta Comercial (MDP Centro)

Herramienta de campo, **mobile-first**, para salir a prospectar comercios del centro de Mar del Plata:
19 leads verificados (13/7/2026) sobre un mapa, con estado de cada visita, distancias en vivo,
guías paso a paso y mensajes de venta pre-cargados.

Es un sitio **100% estático** (un `index.html` + PWA). No necesita servidor ni base de datos:
todo el progreso vive en el dispositivo (`localStorage`) y funciona **sin señal** una vez cargado.

## Qué cambió respecto a la versión anterior
- **Bug crítico de persistencia arreglado.** La versión previa guardaba con `window.storage`
  (API de artifacts de Claude) que **no existe en Vercel** → el progreso se perdía. Ahora usa `localStorage`.
- **Instalable + offline.** Un service worker cachea la app, Leaflet y los tiles ya vistos,
  así sigue andando con señal pobre en la calle una vez cargado.
- **Buscador** por nombre / rubro / dirección.
- **Próxima parada inteligente:** si hay ubicación, sugiere el pendiente **más cercano** (no el siguiente por número).
- **Mensajes de venta pre-cargados** por WhatsApp y mail, redactados según el estado web del comercio
  (sin web / rota / desactualizada / solo redes).
- **Seguimiento:** campo de contacto (nombre) + fecha "volver a contactar", con filtro y recordatorios.
- **Resumen del día** con métricas (contactos, % visitado, conversión, tiempo en la calle) y
  **export** a portapapeles y **CSV**.
- **Agregar comercios en la calle:** botón ＋ → tocás el mapa → cargás un lead nuevo (queda guardado).
- **Modo oscuro** (mapa incluido) + respeta el tema del sistema.
- **Deshacer** al cambiar un estado, vibración, toasts, deep-links (`#stop-7` abre esa ficha).
- Filtros ampliados (Pendientes, ★★★, A seguir, por Tramo, Contactados) y orden por cercanía/prioridad.

## Deploy a Vercel
Sitio estático. **Root Directory = `mapa-atrio`.**
1. **Import (recomendado):** New Project → `demianwolf122/Listas-clientes` → Root Directory `mapa-atrio` → Deploy.
   Los `git push` siguientes redeployan solos.
2. **CLI:** `cd mapa-atrio && vercel --prod`.

## Archivos
- `index.html` — la app completa (Leaflet vía cdnjs + tiles CARTO).
- `manifest.webmanifest`, `icon.svg`, `sw.js` — PWA / offline.
- `vercel.json` — headers de caché (evita servir un SW viejo).

## Ideas para seguir mejorándolo
Ver el detalle en el mensaje de entrega; en resumen: sincronización multi-dispositivo con Supabase
(misma base que `pagina/`), ruta óptima real (orden por vecino más cercano), captura de fotos de fachada,
importar leads del Lead Hunter, y un modo "equipo" para repartir zonas entre vendedores.
