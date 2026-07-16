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

## CRM de campo
- **Resultado de la visita** por comercio (habló c/ dueño · no estaba · pidió presupuesto · interesado · no interesado · cerró) → alimenta un **embudo** en el resumen y el CSV.
- **Foto de fachada** por parada (se sube a Supabase Storage y queda en la ficha).
- **Búsqueda por voz** en el buscador.
- Responsive robusto (grid con `minmax(0,1fr)`, sin desborde horizontal) de 320px a desktop.

## Kit de venta por comercio
- **Speech personalizado** por cada comercio, compuesto según rubro, estado web y reputación (reseñas/rating), con el producto de atrıo que le encaja.
- **📋 Copiar · 🔊 Leer en voz alta (TTS) · 🖥 Modo presentación** (pantalla completa para leerle/mostrarle al cliente).
- **Plan recomendado** (Presencia / Profesional / Premium + precio) por comercio.
- **Objeciones frecuentes** con respuestas listas, adaptadas al rubro.
- **Recordatorio .ics** para el seguimiento y **compartir ficha** (Web Share).

## Copiloto de recorrido
- **Score de oportunidad** por comercio (severidad del estado web × alcance por reseñas × prioridad) con chip y filtro **🔥 Oportunidad**.
- **Optimizador de ruta** (vecino más cercano desde tu ubicación): dibuja el recorrido óptimo y estima **distancia + tiempo caminando**.
- **Dictado por voz** para las notas (Web Speech API, es-AR).
- **Links de inteligencia** por ficha: Google, Instagram, Reseñas.
- **Guardar la zona del mapa offline** (pre-cachea tiles) y **confetti** al concretar un contacto.
- **"Cómo llegar" por dirección exacta** + **"Mover pin"** para corregir la ubicación de una parada.

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
