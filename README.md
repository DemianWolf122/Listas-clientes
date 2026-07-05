# Investigación: leads para ElectroStock (rubro electrónica y servicio técnico)

Investigación del método de búsqueda de leads de **Lead Hunter** y del producto **ElectroStock/Wepairr**,
destilada en un prompt maestro para que un modelo de IA potente ejecute una búsqueda exhaustiva de clientes
del rubro: **técnicos de celulares y venta de electrónica**.

📄 **Entregable principal:** [`PROMPT-busqueda-leads-electronica.md`](./PROMPT-busqueda-leads-electronica.md)

---

## 1. Qué se vende (el producto)

| Producto | Qué es | Para quién |
|---|---|---|
| **ElectroStock** (`atriostock.vercel.app` + `/admin`) | Prototipo de tienda/catálogo de electrónica con carrito y panel de administración propio (alta/baja de productos, categorías). Demo navegable con usuario `invitado`/`invitado`. | Venta de electrónica, celulares, accesorios, informática |
| **Wepairr** (`wepairr.com`) | Plataforma de gestión de taller: tickets/órdenes de reparación con estados y comentarios, inventario con auditoría, caja, presupuestos y aprobaciones, pedidos de compra, equipo/turnos, respuestas rápidas y plantillas de WhatsApp, sucursales. | Servicio técnico de celulares, computación y electrónica |
| **Planes web Atrio Studio** | Presencia ($160k + $35k/mes) · Profesional ($340k + $60k/mes, catálogo + formulario de orden de reparación) · Premium (desde $650k, sistema a medida: gestión de productos, seguimiento de reparaciones, panel admin). | Cualquier negocio del rubro |

El pitch natural del rubro: **catálogo con stock visible + orden de reparación con seguimiento online** —
exactamente lo que ElectroStock y Wepairr ya demuestran.

## 2. El método Lead Hunter (reconstruido desde la base real, 74.790 leads)

Pipeline de 8 etapas observado en el esquema de producción (`lead-hunter` en Supabase):

1. **Descubrimiento multi-modal** — barridos por *área geográfica (bbox) × lote de rubros* contra OSM/Overpass
   y Google Maps (898 barridos registrados; los rubros van en lotes de ~40 categorías por pasada, en castellano:
   `celulares`, `electronica`, `computacion`, `servicio_tecnico`, `audio_hifi`, `electrodomesticos`…).
2. **Clasificación del estado web** — taxonomía de 10 estados: `none`, `social_only`, `broken`, `wix_template`,
   `active`, `active_outdated`, `parking_or_suspended`, `error_page_200`, `blocked_for_audit`, `unknown`;
   más flags verificados: `is_own_site`, `has_agency`, `recently_built`, con `confidence` 0–1.
3. **Actividad / lifecycle** — reseñas de Google (cantidad, rating, recencia) → `thriving / active / declining /
   dormant / dead`; exclusión automática de `permanently_closed`.
4. **Señales de momentum** — append-only, con magnitud y confianza: intención de compra (`meta_ad_active`,
   `intent_coming_soon`, `intent_new_domain`, `intent_web_designer_job`), crecimiento (IG followers/posts),
   vida (reseñas recientes), declive (`ig_abandoned`, `review_drought`) y exclusión (quiebras del Boletín Oficial).
5. **Scoring** — `fit_score` (rubro × tier × estado web) y `momentum_score` (señales) →
   **`final_score = fit^0.6 × momentum^0.4`**; además `conversion_score` y ROI por sub-rubro.
6. **Decisión IA** — veredicto `TAKE / SKIP / WAIT / MANUAL_REVIEW` + confianza + razón en una línea.
7. **Dedup en 4 capas** — id de fuente, hash de identidad (nombre normalizado + geo bucket), CUIT y embedding.
8. **Outreach** — prioridad WhatsApp (formato `549…`, links `wa.me` con mensaje pre-escrito), mails validados por
   MX/SMTP antes de enviar, plantillas con variables `{{nombre}} {{rubro}} {{ciudad}}`, gancho "Vi que…" basado en
   evidencia real, cadencia **5–8 por día** para no quemar el número, follow-up suave a los ~5–7 días,
   entregables HTML clickeables ("joyas") con flujo de 3 botones: saludo → info → cierre.

## 3. Estado actual del rubro en la base (por qué hace falta esta búsqueda)

- 824 leads ya matchean electrónica/técnicos (446 "Electrónica", 160 "electronics_repair", 42 "Electrodomésticos"…).
- **815 de 824 no tienen web** → el rubro es terreno fértil.
- **Solo ~12% tiene teléfono** y casi ninguno WhatsApp verificado → el cuello de botella es la **contactabilidad**,
  no el volumen. La nueva búsqueda exige WhatsApp/contacto verificado como criterio de calidad primario.
- Solo 15 de los 824 son de Mar del Plata → la zona prioritaria está casi virgen para este rubro.

## 4. Cómo usar el prompt

Copiar el contenido completo de `PROMPT-busqueda-leads-electronica.md` en el modelo de IA que vaya a ejecutar la
búsqueda (idealmente uno con navegación web / búsqueda en internet). El prompt incluye: contexto de negocio, ICP
con tiers, geografía priorizada, método de descubrimiento, reglas de verificación y scoring, formato de salida
JSON + HTML accionable, y mensajes de outreach por sub-rubro.
