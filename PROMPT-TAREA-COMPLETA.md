# PROMPT — Tarea completa: cazar leads de electrónica + página + Supabase + Vercel (autónomo hasta las 7am)

> Pegá TODO esto en un chat nuevo de Claude Code (idealmente con un modelo potente en esfuerzo alto y
> con los conectores: GitHub, Supabase, Vercel; y con búsqueda web habilitada).
>
> ⛔ **REGLA CERO — GATE DE CONFIRMACIÓN:** NO ejecutes NADA todavía. Primero verificá si realmente
> podés hacer cada parte (ver §6), reportámelo con evidencia, y **esperá mi "dale" explícito antes de
> tocar nada**. Si algo no lo podés hacer, decímelo con honestidad en vez de simularlo.

---

## 1. QUIÉN SOY Y QUÉ QUIERO

Soy Demian, de **Atrio Studio** (estudio de diseño/desarrollo web, Mar del Plata, Argentina —
atriostudio.com.ar). Quiero una **campaña de prospección automática** para venderles mis productos a
**técnicos de celulares y tiendas de electrónica** de **toda CABA y todo Mar del Plata**.

Quiero que, de forma autónoma y hasta las **07:00 hora Argentina** (o hasta que se corten mis créditos),
un agente **busque leads sin parar**, los guarde en mi base, y que yo pueda verlos y gestionarlos en una
mini-página web. Todo el código y los avances van a mi repo.

## 2. MIS PRODUCTOS (lo que les vendo a esos leads)

- **ElectroStock** (`atriostock.vercel.app` + `/admin`, demo `invitado`/`invitado`): template de catálogo
  con stock en vivo para tiendas de electrónica; el pedido se arma y cierra por WhatsApp; panel admin del
  dueño. Slogan: "Tecnología con stock real, sin vueltas." Repo: `demianwolf122/electrostock`.
- **Wepairr** (`wepairr.com`): SaaS de gestión de talleres de reparación — órdenes con seguimiento
  público online (/tracking), presupuestos aprobables por link, turnos, inventario, caja, IA "Wepi".
  Precios: Starter USD 15/mes, Pro USD 35/mes, Business USD 45/mes. Repo: `demianwolf122/wepairr`.
- **Planes web Atrio**: Presencia $160k+$35k/mes · Profesional $340k+$60k/mes · Premium desde $650k (ARS).

## 3. ASSETS QUE YA EXISTEN (usalos, no reinventes)

- **Repo de trabajo:** `demianwolf122/Listas-clientes`, rama `claude/electrostock-lead-research-w72uu1`.
  Adentro está **`PROMPT-EJECUTABLE-v3.md`**: el spec ejecutable COMPLETO del método de búsqueda de leads
  (zonas con bbox reales, matriz de queries, playbook de leads fantasma, verificación web, scoring
  `final = fit^0.6 × momentum^0.4`, reglas de decisión TAKE/SKIP/WAIT, capa de razonamiento §0.5, reglas
  de mensaje de outreach). **Leé ese archivo y seguí ese método** para la parte de búsqueda.
  Ese repo también tiene `README.md`, `PROMPT-busqueda-leads-electronica.md` (v2 legible) y
  `CONTINUAR-EN-OTRO-CHAT.md` (contexto).
- **Supabase (2 proyectos, misma org):** `Wepairr` (id `wjxekfxyxrfvmsfbqvsj`) y `lead-hunter`
  (id `pkkxjqhhkvsibhftlmbx`, que ya tiene una tabla `leads` con 74.790 registros y todo el sistema).
  ⚠️ Guardá los leads NUEVOS de esta campaña en el proyecto **Wepairr** (yo no tengo otro slot libre) —
  en una tabla nueva y aislada, ej. `atrio_leads_electro`, para no tocar las tablas de la app.
- **Vercel:** tengo cuenta (team "Demian's projects"); el proyecto `wepairr` ya está ahí.

## 4. LO QUE HAY QUE ENTREGAR (4 partes)

**A. Tabla en Supabase (proyecto Wepairr).** Crear `atrio_leads_electro` con, como mínimo: id, name,
sub_rubro, tier, segmento, address, city, zona_barrio, phone, whatsapp, wa_link, email, instagram,
facebook, website, website_status, descripcion (qué hacen / qué venden), manejado_por (dueño/responsable,
si es público), lifecycle, reviews_count, rating, senales (jsonb), fit_score, momentum_score, final_score,
verdict, verdict_reason, producto_sugerido, gancho, mensaje_whatsapp, confianza_global, fuentes (jsonb),
contactado (bool default false), contactado_at, notas, created_at, updated_at. RLS con política de lectura
(y update de `contactado`/`notas`) para que la página funcione. Dedup por (nombre normalizado + ciudad).

**B. Búsqueda de leads AUTÓNOMA.** Ejecutar el método de `PROMPT-EJECUTABLE-v3.md` sobre **toda CABA
(barrio por barrio, empezando por Once que es el epicentro mayorista) + todo Mar del Plata**. Por cada
lead: verificar estado web, sacar contacto (WhatsApp normalizado `549…`), describir qué hace/vende y quién
lo maneja (si es público — si no, vacío, NUNCA inventado), scorear, decidir TAKE/SKIP/WAIT, y si es TAKE
redactar el mensaje de WhatsApp según las reglas del spec. Upsert a la tabla. **Loop auto-reprogramado**
(self-wake / trigger) que sigue buscando zona por zona y **frena solo a las 07:00 ARG**. Registrar avance
(cuántos leads, qué zonas cubiertas, qué queda) en un archivo de log en el repo tras cada ciclo.

**C. Mini-página web (deploy a Vercel).** Un index que lea EN VIVO la tabla de Supabase y muestre los
leads. Debe tener: barra de búsqueda por texto; filtros (zona/barrio, sub-rubro, estado web, verdict,
contactado sí/no, producto sugerido); tarjeta por lead con toda la info (descripción, qué venden, quién lo
maneja/jefe si existe, scores, veredicto y motivo); **un botón por cada canal de contacto** (WhatsApp →
wa.me con mensaje pre-cargado, Llamar → tel:, Mail → mailto:, Instagram, Facebook, Web, Google Maps); y un
**checkbox/botón "Contactado"** que persista el cambio en Supabase en vivo. Mobile-first. Deploy a Vercel.

**D. Todo al repo.** Código de la página, SQL de la tabla, scripts, y el log de avance — commiteado y
pusheado a la rama de trabajo. Si no hay PR abierto para esa rama, abrilo.

## 5. REGLAS INNEGOCIABLES

- **R1. Vacío > inventado.** Ningún dato de contacto, dirección, dueño ni descripción se inventa. Sin
  fuente ⇒ campo vacío + confianza baja.
- **R2. Cada dato cita su fuente** (google/maps/instagram/facebook/web/directorio).
- **R3. Mensajes de outreach** siguen las reglas de `PROMPT-EJECUTABLE-v3.md` §8.4: breves, sin marcar
  errores del negocio, sin prometer resultados, sin fingir familiaridad, gancho con evidencia real.
- **R4. Excluir** cadenas (Frávega, Musimundo…), oficiales (Personal, Claro, Movistar, MacStation…),
  cerrados permanentes y enterprise. ICP y tiers según el spec §2.
- **R5. Cobertura declarada:** al final de cada ciclo, decir qué zonas/queries se cubrieron y qué quedó.
- **R6. Pacing seguro:** si generás mensajes, la recomendación de envío es 5-8 WhatsApp/día — la página es
  para gestión, vos NO enviás nada automáticamente.

## 6. ⛔ GATE DE CONFIRMACIÓN — HACÉ ESTO PRIMERO, ANTES DE EJECUTAR NADA

Verificá con pruebas reales (no supongas) y reportame en una tabla **SÍ/NO + evidencia** cada capacidad:

1. **Búsqueda web:** ¿tenés WebSearch/WebFetch funcionando? Probá UNA búsqueda real de un lead del rubro
   en CABA o MDP y mostrame que traés datos reales. ¿WebFetch abre webs de negocios o da 403?
2. **Supabase Wepairr:** ¿podés listar el proyecto `wjxekfxyxrfvmsfbqvsj` y crear una tabla ahí?
3. **Vercel:** ¿podés deployar? ¿Con qué herramienta/flujo?
4. **Autonomía hasta las 7am:** ¿tenés forma de auto-reprogramarte (self-wake / trigger / cron) para
   seguir corriendo en ciclos sin que yo esté? ¿Cuál y con qué límite?
5. **Repo:** ¿podés commitear y pushear a `demianwolf122/Listas-clientes`?

Después del reporte, decime con franqueza: **¿podés hacer TODO lo pedido, o sólo una parte?** Si hay algo
que no podés (ej. navegar Instagram/Maps directo por política de red, o mantener el loop mientras estoy
desconectado), decilo claramente y proponé el plan realista alternativo. **Y esperá mi "dale" antes de
crear la tabla, la página o largar el loop.** No ejecutes ninguna de las 4 partes hasta que yo confirme.
