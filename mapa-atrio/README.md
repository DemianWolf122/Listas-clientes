# atrıo · Mapa de Ruta Comercial (MDP Centro)

Herramienta de campo, **mobile-first**, para salir a prospectar comercios del centro de Mar del Plata:
19 leads verificados (13/7/2026) sobre un mapa, con estado de cada visita, distancias en vivo,
guías paso a paso y mensajes de venta pre-cargados.

Es un sitio **estático** (un `index.html` + PWA) con backend **Supabase** para las rutas. Funciona
**offline-first**: arranca al instante desde `localStorage` y sincroniza con Supabase cuando hay red.

## Multi-ruta + Supabase
- Soporta **varias rutas de venta**. La primera es **"Ruta comercial Centro Mar del Plata 1"** (19 comercios).
- **Selector de rutas** en el header (tocá el nombre de la ruta ▾): cambiar de ruta, ver progreso de cada una, **crear rutas nuevas**.
- **Backend:** proyecto Supabase *Wepairr* (`wjxekfxyxrfvmsfbqvsj`), en un **schema aislado `atrio_rutas`**
  (no toca `atrio_agenda`, `public`/wepairr ni `jardin`). Tablas: `rutas`, `paradas`, `visitas` (con RLS + realtime).
- **Progreso por vendedor:** cada persona registra sus visitas con su nombre (`visitas.vendedor`), así no se pisan.
- **Offline-first:** todo cachea en `localStorage` por ruta; los cambios sin red se encolan y se sincronizan al reconectar.
- La `anon key` embebida es *publishable* (la misma que usa el HQ `agenda`); la protege el RLS del schema.

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
- `index.html` — la app completa (Leaflet vía cdnjs + tiles CARTO + REST de Supabase).
- `manifest.webmanifest`, `icon.svg`, `sw.js` — PWA / offline.
- `vercel.json` — headers de caché (evita servir un SW viejo).

## Esquema Supabase (schema `atrio_rutas`)
- `rutas(id, nombre, descripcion, ciudad, color, orden, archivada, …)`
- `paradas(id, ruta_id→rutas, numero, nombre, rubro, direccion, lat, lng, telefono, email, place_id,
  rating, reviews, web, web_kind, hook, tip, opens_at, closes_at, prioridad, tramo, fuente, archivada)`
  — único `(ruta_id, numero)`.
- `visitas(id, parada_id→paradas, vendedor, estado, contacto, volver_a_contactar, nota)` — único `(parada_id, vendedor)`.

## Ideas para seguir mejorándolo
Ruta óptima real (vecino más cercano / TSP), traer leads del Lead Hunter automáticamente, captura de fotos
de fachada por parada, notificaciones push el día del seguimiento, y un modo "equipo" con vista consolidada
de todos los vendedores.
