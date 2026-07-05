# Prompt de traspaso — continuar la tarea en otro chat

> Copiar todo lo que sigue en un chat nuevo de Claude Code (idealmente con los mismos conectores:
> GitHub, Supabase, Google Drive, Gmail).

---

Hola. Venís a continuar una tarea ya avanzada. Contexto completo:

## Quién soy y qué busco
Soy Demian, de **Atrio Studio** (estudio de diseño/desarrollo web, Mar del Plata, Argentina —
atriostudio.com.ar). Estoy armando una campaña de prospección para el rubro **técnicos de celulares y
venta de electrónica**, para venderles mis productos:
- **ElectroStock** (`atriostock.vercel.app` + `/admin`, demo `invitado`/`invitado`): template de
  catálogo con stock en vivo para tiendas de electrónica; el pedido se arma y cierra por WhatsApp;
  panel admin propio del dueño. Repo: `demianwolf122/electrostock`.
- **Wepairr** (`wepairr.com`): SaaS de gestión de talleres de reparación — tickets con seguimiento
  público online (/tracking), presupuestos aprobables por link, turnos, inventario, caja, IA "Wepi".
  Precios: Starter USD 15/mes, Pro USD 35/mes, Business USD 45/mes. Repo: `demianwolf122/wepairr`.
- **Planes web**: Presencia $160k + $35k/mes · Profesional $340k + $60k/mes · Premium desde $650k (ARS).
- Tengo también **Lead Hunter** (repo `demianwolf122/lead-hunter` + proyecto Supabase `lead-hunter`,
  id `pkkxjqhhkvsibhftlmbx`): mi sistema de prospección con 74.790 leads, scoring y outreach.

## Qué se hizo ya (sesión anterior)
Todo está commiteado en el repo **`demianwolf122/Listas-clientes`**, rama
`claude/electrostock-lead-research-w72uu1` (es la rama default):
1. **`README.md`** — investigación del método Lead Hunter reconstruido (pipeline de 8 etapas).
2. **`PROMPT-busqueda-leads-electronica.md`** — **PROMPT MAESTRO v2**: el entregable principal.
   Prompt extenso para que un modelo de IA con navegación web ejecute la búsqueda exhaustiva de leads
   del rubro. Calibrado con datos REALES extraídos del código de producción de lead-hunter:
   - Scoring real: fit base por website_status (none 70/social_only 58/broken 50...), tiers,
     `final_score = fit^0.6 × momentum^0.4`, pesos exactos de señales de momentum (half-life 30 días).
   - Reglas de decisión verbatim (TAKE/SKIP/WAIT/MANUAL_REVIEW) del Decision Intelligence.
   - Heurísticas de verificación web (taxonomía de 10 estados, hosts gratuitos, parking, SSL).
   - Reglas de oro del outreach (breve, no marcar errores, no fingir familiaridad, gancho con evidencia).
   - Aprendizajes internos de `/workspace/lead-hunter/docs/`: "lente corregida" (web caída ≠ apatía),
     "gap web ≠ dolor sentido" (el competidor es 'con el IG nos alcanza'), playbook de leads fantasma
     (los mejores leads solo están en Instagram), "Vacío > inventado".
   - Normalización WhatsApp AR (549 + área sin 0 + número sin 15), cadencia 5-8/día, cool-down 60 días.

## Datos clave ya verificados (no re-derivar)
- En la base lead-hunter ya hay **824 leads de electrónica** (446 "Electrónica", 160 "electronics_repair"),
  **815 sin web**, solo ~12% con teléfono, y solo 15 de Mar del Plata → la búsqueda nueva debe priorizar
  **contactabilidad (WhatsApp)** y **MDP primero**.
- El outreach_log tiene 970 borradores/140 enviados y **cero respuestas registradas** → no hay datos de
  qué mensaje convierte; los outcomes hay que empezar a registrarlos.
- No existe repo "atrio" (el sitio atriostudio.com.ar está deployado directo en Vercel, sin repo).
  La red del entorno remoto bloquea fetch a atriostudio.com.ar y atriostock.vercel.app (403 del proxy).
- ⚠️ Seguridad pendiente: 10 tablas del proyecto Supabase lead-hunter tienen RLS deshabilitado
  (lead_signals, scraper_jobs, lead_decisions, lead_outcomes, etc.).

## Archivos fuente clave (si clonás los repos)
- `lead-hunter/src/lib/categories.ts` (rubros→tags OSM→tier), `subrubro.ts` (ROI por sub-rubro),
  `contratabilidad.ts` (conversion_score real), `momentum.ts` (pesos señales), `website-truth.ts`
  (verificación web), `decision-intel.ts` (prompt del veredicto IA), `outreach-writer.ts` (reglas de
  mensajes), `docs/SUPER-ANALISIS-MASTER.md`, `docs/PLAYBOOK-LEADS-FANTASMA.md`,
  `docs/ANALISIS-CONVERSION-10-LEADS.md`.
- `electrostock/README.md` + `SPEC.md` + `src/config.ts` (features y copy).
- `wepairr/src/pages/FeatureTour.jsx` + `PricingPage.jsx` + `src/config/planFeatures.js` (copy de
  venta y precios), `design-system/RBAC.md`.

## Qué sigue (elegir según lo que yo pida)
1. **Ejecutar la búsqueda**: correr el PROMPT MAESTRO v2 (o pasármelo para correrlo en otro modelo).
   Si la corrés vos: seguí el prompt al pie de la letra, zona por zona, empezando por Mar del Plata.
2. **Refinar el prompt** con lo que falta: copy real de atriostudio.com.ar (pedírmelo), outcomes
   reales de ventas (pedirme quién respondió/compró), o adaptarlo al modelo destino específico.
3. **Importar resultados**: cuando haya leads nuevos, deduplicar contra la base Supabase lead-hunter
   (por nombre normalizado + ciudad) e insertarlos con el schema de la tabla `leads`.
4. **Arreglar RLS** en Supabase si lo pido (con políticas, no solo ENABLE).

Empezá confirmándome qué opción quiero y si tenés acceso a los conectores (GitHub, Supabase, Drive).
