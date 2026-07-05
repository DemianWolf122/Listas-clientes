# LOG DE AVANCE · Atrio Lead Hunter (electrónica CABA + MDP)

Cada ciclo del autoloop agrega una línea acá. Formato: `[fecha ART] zona/familia · +N leads (TAKE/WAIT/SKIP/MANUAL) · pendientes: N`

## Ciclo 0 — seed manual (2026-07-05, sesión de arranque)
- Infra creada: tablas `atrio_leads_electro` + `atrio_leads_coverage` (Supabase Wepairr), página web, autoloop programado (cada 20 min, frena 07:00 ART).
- **6 leads semilla** cargados desde WebSearch real (Once + MDP):
  - TAKE: Salvacell (Once, IG), Costantino Celulares (MDP, FB).
  - WAIT: 3N Celulares (MDP, web propia).
  - SKIP: Wiltech Argentina (>70k seguidores → enterprise).
  - MANUAL_REVIEW: J&L Reparaciones (Once, IG sin contacto), Servicio Técnico Av. Luro 3317 (MDP, sin canal).
- Cobertura sembrada: 18 celdas (zona × familia) en estado `pending`.
- Nota honesta: WhatsApp de varios leads quedó vacío (R1) — el autoloop lo enriquece por ciclo.

## Cambio de estrategia (2026-07-05) — cazador local GRATIS
- Autoloop de Claude **apagado** (gastaba créditos). Reemplazado por `leadhunter/hunter.py`:
  script Python que caza con fuentes gratis (Overpass/OSM + DuckDuckGo), aplica el método
  determinista del spec y sube a Supabase vía RPC con secreto. **Corre sin gastar créditos.**
- Reparto: el script hace el 90% (buscar/scorear/subir); Claude solo afina los TAKE (barato).
- Probado OK: Once trajo 46 locales OSM → 8 procesados/insertados; cadenas (Frávega, Megatone) → SKIP.

## Verificación Nivel 2 + página v2 (2026-07-05)
- Barrido completo: ~498 leads en la base (Once + CABA + MDP).
- **Verificados con web (16 mejores TAKE)**: 7 confirmados TAKE (Costantino, MX Computación, American Computers,
  JFG, Solution Store, Dhaka-Cell, Tech Solutions); reclasificados: Selfie Store y Casio Shop → SKIP (cadena/oficial),
  HTG/Salvacell/Toshimar → WAIT (web propia), PC King/Polo Cel/G&G/Julmar → MANUAL. Salvacell corrigió dirección (mudanza).
- Mensajes de mail (asunto+cuerpo) cargados para los 7 TAKE.
- **Página v2**: responsive (grilla adaptable), filtros rápidos (TAKE/Verificados/zona), orden, copiar mensajes
  (WhatsApp/mail), detalle expandible, badge "verificado". Redeploy a Vercel.

## Mensajes con psicología de ventas + página v3 (2026-07-05)
- Mensajes de los 7 TAKE reescritos con aversión a la pérdida (dolor operativo real: "¿ya está listo?",
  contestar stock por chat, comisión de ML) + efecto dotación (demo funcionando) + tono de vecino — sin
  marcar errores ni prometer resultados (respetando M1-M6 del spec).
- Página v3: botón "Buscar y filtrar" que pliega toda la búsqueda; mensajes de cada lead plegados detrás de
  un toggle "Mensajes"; tarjetas más limpias. Verificado en preview, redeploy a Vercel.

## Ciclos autónomos
<!-- el autoloop escribe debajo -->
- [2026-07-05 ~03:35 ART] caba-once/celulares · +2 leads (0 TAKE / 2 WAIT / 0 SKIP / 0 MANUAL) · pendientes: 17. Nota: Once/celulares por WebSearch trae negocios con web propia establecida (OnCelular, Celulares Pueyrredón) → WAIT. Los fantasma TAKE requieren ángulo Maps/IG (403). Ciclo de prueba manual end-to-end OK.
