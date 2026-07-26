import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { SCHEMA } from "@/lib/constants";
import { mcpSecret } from "@/lib/mcp-config";
import { ROUTINE_AREAS, occursOn, toMin, type RoutineArea } from "@/lib/routine";

/**
 * Servidor MCP de Atrio (Streamable HTTP, stateless) para los conectores
 * personalizados de claude.ai. Cada uno lo agrega en su claude.ai (Ajustes →
 * Conectores → agregar por URL) y Claude puede operar TODA la app: agenda,
 * tareas (con subtareas, comentarios y etiquetas), proyectos, eventos, docs,
 * chat y avisos push. JSON-RPC 2.0 sobre POST; sin sesiones ni SSE.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const AR_OFFSET_MS = 3 * 3600 * 1000; // Buenos Aires: UTC-3 fijo
const hoyAR = () => new Date(Date.now() - AR_OFFSET_MS).toISOString().slice(0, 10);
const horaAR = (iso: string) => new Date(new Date(iso).getTime() - AR_OFFSET_MS).toISOString().slice(11, 16);
const fechaAR = (iso: string) => new Date(new Date(iso).getTime() - AR_OFFSET_MS).toISOString().slice(0, 10);

const PASTELS = ["#F3D9E0", "#F6D6CE", "#EFE7D2", "#DEEEDD", "#D7E5F5", "#E4DCF3", "#F5E6C8", "#CFE9E6", "#F0DDD0", "#E9E9E7"];

function supa() {
  return createClient<Database, typeof SCHEMA>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: SCHEMA } }
  );
}

/* ------------------------------ helpers de dominio ------------------------------ */

type DB = ReturnType<typeof supa>;

function chk<T>(r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new Error(`Base de datos: ${r.error.message}`);
  return r.data;
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
const SIN_ASIGNAR = new Set(["nadie", "sin asignar", "ninguno", "ninguna", "nobody", "unassigned", "equipo"]);

/** Match tolerante: "lucila", "para Lucila", "Lucíla" → Lucila (en cualquier dirección). */
async function perfil(db: DB, nombre?: string | null) {
  if (!nombre) return null;
  const data = chk(await db.from("profiles").select("id,name"));
  const n = norm(String(nombre));
  const hit = (data ?? []).find((p) => {
    const pn = norm(p.name);
    return n === pn || n.includes(pn) || pn.includes(n);
  });
  if (!hit) throw new Error(`No encontré a "${nombre}" (probá "Lucila" o "Demian").`);
  return hit;
}

async function nombresPorId(db: DB): Promise<Record<string, string>> {
  const data = chk(await db.from("profiles").select("id,name"));
  return Object.fromEntries((data ?? []).map((p) => [p.id, p.name]));
}

async function proyecto(db: DB, ref?: string | null) {
  if (!ref) return null;
  const esUuid = /^[0-9a-f-]{36}$/i.test(ref);
  const q = esUuid
    ? db.from("projects").select("id,name,emoji").eq("id", ref).limit(1)
    : db.from("projects").select("id,name,emoji").ilike("name", `%${ref}%`).limit(1);
  const data = chk(await q);
  if (!data?.length) throw new Error(`No encontré el proyecto "${ref}" (usá listar_proyectos).`);
  return data[0];
}

const ESTADOS: Record<string, string> = {
  pendiente: "todo", "por hacer": "todo", todo: "todo",
  "en progreso": "in_progress", en_progreso: "in_progress", in_progress: "in_progress", doing: "in_progress",
  hecha: "done", hecho: "done", lista: "done", listo: "done", completada: "done", done: "done",
};
const PRIORIDADES: Record<string, string> = {
  ninguna: "none", none: "none", baja: "low", low: "low",
  media: "medium", medium: "medium", alta: "high", high: "high", urgente: "urgent", urgent: "urgent",
};
const estadoLabel: Record<string, string> = { todo: "pendiente", in_progress: "en progreso", done: "hecha ✓" };

/* --- rutina: áreas (sub-calendarios) y repetición, en castellano --- */
const AREAS_RUTINA: Record<string, RoutineArea> = {
  deep: "deep", dw: "deep", profundo: "deep", "trabajo profundo": "deep", "deep work": "deep", foco: "deep", creativo: "deep",
  meetings: "meetings", mtg: "meetings", reunion: "meetings", reuniones: "meetings", llamada: "meetings", call: "meetings",
  admin: "admin", adm: "admin", administrativo: "admin", administrativa: "admin", administrativas: "admin", mails: "admin", tramites: "admin",
  health: "health", hlth: "health", salud: "health", gimnasio: "health", gym: "health", terapia: "health", descanso: "health",
  social: "social", soc: "social", personal: "social", pareja: "social", amigos: "social", familia: "social",
};
const REPETICIONES: Record<string, string> = {
  no: "none", none: "none", nunca: "none", "una vez": "none", "no se repite": "none",
  diario: "daily", diaria: "daily", daily: "daily", "todos los dias": "daily",
  weekdays: "weekdays", habiles: "weekdays", "dias habiles": "weekdays", "lunes a viernes": "weekdays",
  weekly: "weekly", semanal: "weekly", "cada semana": "weekly",
};

function normArea(v?: string | null): RoutineArea {
  if (!v) return "deep";
  const a = AREAS_RUTINA[norm(String(v))];
  if (!a) {
    throw new Error(
      `Área inválida: "${v}". Usá: trabajo profundo | reuniones | administrativo | salud | social.`
    );
  }
  return a;
}

function normRepeticion(v?: string | null): string {
  if (!v) return "none";
  const r = REPETICIONES[norm(String(v))];
  if (!r) throw new Error(`Repetición inválida: "${v}". Usá: no | diario | lunes a viernes | semanal.`);
  return r;
}

function lineaBloque(b: any, conId = true) {
  const meta = ROUTINE_AREAS[(b.area as RoutineArea) ?? "deep"] ?? ROUTINE_AREAS.deep;
  const hora = `${String(b.start_time).slice(0, 5)}–${String(b.end_time).slice(0, 5)}`;
  const sigla = [meta.short, b.code].filter(Boolean).join(" | ");
  const repite = b.repeat_rule && b.repeat_rule !== "none" ? ` · repite: ${b.repeat_rule}` : "";
  return `${b.done ? "✅" : meta.emoji} ${hora} · ${sigla} · ${b.title}${b.notes ? ` — ${b.notes}` : ""}${repite}${conId ? ` · id:${b.id}` : ""}`;
}

function normHora(h?: string | null) {
  if (!h) return null;
  const m = h.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) throw new Error(`Hora inválida: "${h}" (usá HH:MM, ej. 14:30).`);
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

function lineaTarea(t: any, conId = true) {
  const partes = [
    t.status === "done" ? "✅" : t.status === "in_progress" ? "🔵" : "⚪",
    t.title,
    t.start_date ? `· ${t.start_date}${t.start_time ? ` ${String(t.start_time).slice(0, 5)}` : ""}${t.end_time ? `–${String(t.end_time).slice(0, 5)}` : ""}` : "",
    t.due_date ? `· entrega ${t.due_date}${t.due_time ? ` ${String(t.due_time).slice(0, 5)}` : ""}` : "",
    t.assignee ? `· ${t.assignee}` : "",
    t.priority && t.priority !== "none" ? `· prioridad ${t.priority}` : "",
    conId ? `· id:${t.id}` : "",
  ];
  return partes.filter(Boolean).join(" ");
}

function lineaEvento(e: any, conId = true) {
  return `📅 ${e.title} · ${fechaAR(e.starts_at)} ${e.all_day ? "(todo el día)" : `${horaAR(e.starts_at)}${e.ends_at ? `–${horaAR(e.ends_at)}` : ""}`}${e.description ? ` — ${e.description}` : ""}${conId ? ` · id:${e.id}` : ""}`;
}

/** Aviso interno + intento de push inmediato (la edge function despacha pendientes). */
async function notificar(db: DB, n: { recipient_id: string; actor_id?: string | null; type: string; title: string; body?: string | null; target_type?: string | null; target_id?: string | null }) {
  await db.from("notifications").insert({ actor_id: null, body: null, target_type: null, target_id: null, ...n });
  try {
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/push-dispatch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: "{}",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    /* el cron lo despacha en ≤5 min igual */
  }
}

/** Markdown simple → bloques de BlockNote (PartialBlock[], ids opcionales). */
function mdABloques(md: string) {
  const bloques: any[] = [];
  for (const raw of md.split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;
    const h = line.match(/^(#{1,3})\s+(.*)/);
    if (h) { bloques.push({ type: "heading", props: { level: h[1].length }, content: h[2] }); continue; }
    const b = line.match(/^[-*]\s+(.*)/);
    if (b) { bloques.push({ type: "bulletListItem", content: b[1] }); continue; }
    const n = line.match(/^\d+[.)]\s+(.*)/);
    if (n) { bloques.push({ type: "numberedListItem", content: n[1] }); continue; }
    bloques.push({ type: "paragraph", content: line.trim() });
  }
  return bloques;
}

/** Bloques de BlockNote → texto plano legible. */
function bloquesATexto(content: unknown): string {
  if (!Array.isArray(content)) return "(doc vacío)";
  const inline = (c: any): string =>
    typeof c === "string" ? c : Array.isArray(c) ? c.map((x) => x?.text ?? inline(x?.content ?? "")).join("") : "";
  const lineas: string[] = [];
  const walk = (blocks: any[], depth = 0) => {
    for (const bl of blocks) {
      const texto = inline(bl?.content);
      const pre = bl?.type === "heading" ? "#".repeat(bl?.props?.level ?? 1) + " " :
        bl?.type === "bulletListItem" ? "  ".repeat(depth) + "- " :
        bl?.type === "numberedListItem" ? "  ".repeat(depth) + "1. " : "";
      if (texto || pre) lineas.push(pre + texto);
      if (Array.isArray(bl?.children) && bl.children.length) walk(bl.children, depth + 1);
    }
  };
  walk(content as any[]);
  return lineas.join("\n") || "(doc vacío)";
}

async function buscarDoc(db: DB, ref: string) {
  const esUuid = /^[0-9a-f-]{36}$/i.test(ref);
  const q = esUuid
    ? db.from("docs").select("id,title,icon,content").eq("id", ref).limit(1)
    : db.from("docs").select("id,title,icon,content").ilike("title", `%${ref}%`).limit(1);
  const data = chk(await q);
  if (!data?.length) throw new Error(`No encontré ningún doc que matchee "${ref}".`);
  return data[0];
}

async function buscarCanal(db: DB, ref: string) {
  const canales = chk(await db.from("channels").select("id,name,kind"));
  const r = ref.toLowerCase();
  const canal = (canales ?? []).find((c) => (r === "dm" ? c.kind === "dm" : c.name.toLowerCase().includes(r)));
  if (!canal) throw new Error(`No encontré el canal "${ref}". Hay: ${(canales ?? []).map((c) => c.name).join(", ")}.`);
  return canal;
}

/* ------------------------------ herramientas ------------------------------ */

const T = (name: string, description: string, properties: Record<string, any> = {}, required: string[] = []) => ({
  name, description, inputSchema: { type: "object", properties, required },
});
const S = (description: string) => ({ type: "string", description });

const TOOLS = [
  /* --- agenda --- */
  T("ver_agenda", "Agenda de un día: tareas con horario/entrega y eventos del equipo. Por defecto hoy (Buenos Aires) y todo el equipo.", {
    fecha: S("YYYY-MM-DD (default: hoy)"), persona: S("Lucila o Demian (vacío = equipo)"),
  }),
  T("resumen_semana", "Panorama de la semana (lunes a domingo): tareas por persona y eventos. Ideal para planificar.", {
    fecha: S("Cualquier día de la semana a resumir (default: hoy)"),
  }),
  /* --- tareas --- */
  T("buscar_tareas", "Busca tareas por texto, estado, persona o proyecto. Devuelve ids para operar sobre ellas.", {
    texto: S("Texto en el título"), estado: S("pendiente | en progreso | hecha"), persona: S("Lucila o Demian"),
    proyecto: S("Nombre del proyecto"), limite: { type: "number", description: "Máx. resultados (default 15)" },
  }),
  T("ver_tarea", "Detalle completo de una tarea: descripción, etiquetas, subtareas y comentarios.", { id: S("id de la tarea") }, ["id"]),
  T("crear_tarea", "Crea una tarea (horario opcional para la agenda). Si no pasás 'persona', queda asignada a quien la pide ('de'). Notifica al asignado si no es quien la pide.", {
    titulo: S("Título (podés arrancar con un emoji)"),
    persona: S("A QUIÉN queda asignada: Lucila o Demian. Si el usuario dice 'para mí'/'mi tarea', usá el nombre de quien habla. 'nadie' = dejarla sin asignar."),
    fecha: S("Día del bloque (YYYY-MM-DD)"), hora_inicio: S("HH:MM"), hora_fin: S("HH:MM"),
    fecha_entrega: S("Fecha límite (YYYY-MM-DD)"), hora_entrega: S("HH:MM"), descripcion: S("Detalle"),
    prioridad: S("baja | media | alta | urgente"), etiquetas: { type: "array", items: { type: "string" }, description: "Etiquetas por nombre" },
    proyecto: S("Proyecto por nombre"), subtarea_de: S("id de la tarea madre (para crear una subtarea)"),
    de: S("Quién la está pidiendo (Lucila o Demian) — no es el asignado, para eso usá 'persona'"),
  }, ["titulo"]),
  T("actualizar_tarea", "Cambia una tarea por id: estado, horarios, asignado, título, proyecto, prioridad… Avisa al nuevo asignado si se reasigna.", {
    id: S("id"), estado: S("pendiente | en progreso | hecha"), titulo: S("Nuevo título"), descripcion: S("Nueva descripción"),
    persona: S("Reasignar a Lucila o Demian"), fecha: S("YYYY-MM-DD"), hora_inicio: S("HH:MM"), hora_fin: S("HH:MM"),
    fecha_entrega: S("YYYY-MM-DD"), hora_entrega: S("HH:MM"), prioridad: S("baja | media | alta | urgente"),
    proyecto: S("Mover a proyecto (por nombre)"), de: S("Quién pide el cambio"),
  }, ["id"]),
  T("eliminar_tarea", "Borra una tarea definitivamente (con sus etiquetas y comentarios). Confirmá antes con el usuario.", { id: S("id de la tarea") }, ["id"]),
  T("comentar_tarea", "Deja un comentario en una tarea y le avisa al asignado.", {
    id: S("id de la tarea"), texto: S("El comentario"), de: S("Quién comenta (Lucila o Demian)"),
  }, ["id", "texto", "de"]),
  T("etiquetar_tarea", "Agrega o quita etiquetas de una tarea (por nombre).", {
    id: S("id de la tarea"), agregar: { type: "array", items: { type: "string" } }, quitar: { type: "array", items: { type: "string" } },
  }, ["id"]),
  /* --- rutina (sub-calendarios personales) --- */
  T("ver_rutina", "La rutina de una persona en un día: bloques de los 5 sub-calendarios (trabajo profundo, reuniones, administrativo, salud, social) ordenados por hora.", {
    persona: S("Lucila o Demian"), fecha: S("YYYY-MM-DD (default: hoy)"),
  }, ["persona"]),
  T("crear_bloque_rutina", "Agenda un bloque en la rutina de alguien. Las áreas tienen su franja: trabajo profundo 10:00–14:00 (máximo foco), reuniones y administrativo a la tarde; salud y social cuando entren.", {
    persona: S("De quién es la rutina: Lucila o Demian"),
    titulo: S("Qué se hace en el bloque"),
    area: S("trabajo profundo | reuniones | administrativo | salud | social"),
    fecha: S("YYYY-MM-DD"), hora_inicio: S("HH:MM"), hora_fin: S("HH:MM"),
    sigla: S("Sigla corta del proyecto, ej. ESC (se ve como 'DW | ESC · título')"),
    notas: S("Detalle opcional"),
    repetir: S("no | diario | lunes a viernes | semanal (default: no)"),
    repetir_hasta: S("YYYY-MM-DD hasta cuándo se repite (opcional)"),
    de: S("Quién lo pide (Lucila o Demian)"),
  }, ["persona", "titulo", "area", "fecha", "hora_inicio", "hora_fin"]),
  T("actualizar_bloque_rutina", "Cambia un bloque de rutina por id (horario, área, título, sigla, notas, o marcarlo como hecho).", {
    id: S("id del bloque"), titulo: S("Nuevo título"), area: S("Nueva área"),
    fecha: S("YYYY-MM-DD"), hora_inicio: S("HH:MM"), hora_fin: S("HH:MM"),
    sigla: S("Nueva sigla"), notas: S("Nuevas notas"), hecho: { type: "boolean", description: "true = completado" },
    repetir: S("no | diario | lunes a viernes | semanal"),
  }, ["id"]),
  T("eliminar_bloque_rutina", "Borra un bloque de la rutina. Confirmá antes con el usuario.", { id: S("id del bloque") }, ["id"]),
  /* --- etiquetas --- */
  T("listar_etiquetas", "Lista las etiquetas disponibles con su color."),
  T("crear_etiqueta", "Crea una etiqueta nueva (color pastel automático si no se especifica).", {
    nombre: S("Nombre de la etiqueta"), color: S("Hex opcional, ej. #DEEEDD"),
  }, ["nombre"]),
  /* --- proyectos --- */
  T("listar_proyectos", "Lista los proyectos del estudio (con cliente y cantidad de tareas abiertas)."),
  T("ver_proyecto", "Detalle de un proyecto: tareas agrupadas por estado.", { nombre_o_id: S("Nombre o id") }, ["nombre_o_id"]),
  T("crear_proyecto", "Crea un proyecto nuevo.", {
    nombre: S("Nombre"), emoji: S("Un emoji (ej. 🌿)"), color: S("Hex opcional"),
    cliente: S("Nombre del cliente"), descripcion: S("Descripción"), de: S("Quién lo crea"),
  }, ["nombre"]),
  /* --- eventos --- */
  T("listar_eventos", "Próximos eventos del equipo (default: 14 días desde hoy).", {
    desde: S("YYYY-MM-DD (default hoy)"), dias: { type: "number", description: "Cuántos días mirar (default 14)" },
  }),
  T("crear_evento", "Crea un evento de equipo en el calendario (les avisa a los dos cuando está por empezar).", {
    titulo: S("Título"), fecha: S("YYYY-MM-DD"), hora_inicio: S("HH:MM (omitir si es todo el día)"),
    hora_fin: S("HH:MM"), descripcion: S("Detalle"), todo_el_dia: { type: "boolean" },
  }, ["titulo", "fecha"]),
  T("actualizar_evento", "Cambia un evento por id (título, fecha, horas, descripción).", {
    id: S("id del evento"), titulo: S("Nuevo título"), fecha: S("YYYY-MM-DD"),
    hora_inicio: S("HH:MM"), hora_fin: S("HH:MM"), descripcion: S("Nueva descripción"),
  }, ["id"]),
  T("eliminar_evento", "Borra un evento del calendario. Confirmá antes con el usuario.", { id: S("id del evento") }, ["id"]),
  /* --- docs --- */
  T("listar_docs", "Lista los documentos del estudio (título + id)."),
  T("leer_doc", "Lee un documento por id o título (contenido como texto).", { id_o_titulo: S("id o título") }, ["id_o_titulo"]),
  T("crear_doc", "Crea un documento en Docs desde markdown simple (#/##/### títulos, - bullets, 1. listas).", {
    titulo: S("Título"), contenido_markdown: S("Contenido"), icono: S("Un emoji (ej. 📝)"), de: S("Quién lo crea"),
  }, ["titulo", "contenido_markdown"]),
  T("agregar_a_doc", "Agrega contenido al final de un doc existente (markdown simple).", {
    id_o_titulo: S("id o título del doc"), contenido_markdown: S("Lo que se agrega"),
  }, ["id_o_titulo", "contenido_markdown"]),
  T("eliminar_doc", "Borra un documento definitivamente. Confirmá antes con el usuario.", { id: S("id del doc") }, ["id"]),
  /* --- chat --- */
  T("leer_chat", "Últimos mensajes de un canal del chat.", {
    canal: S("general | estudio-botanico | dm"), cantidad: { type: "number", description: "Cuántos (default 20)" },
  }, ["canal"]),
  T("enviar_mensaje", "Manda un mensaje al chat de Atrio. Canales: general, estudio-botanico, dm (Lucila & Demian).", {
    canal: S("general | estudio-botanico | dm"), texto: S("El mensaje"), de: S("Quién lo manda (Lucila o Demian)"),
  }, ["canal", "texto", "de"]),
  /* --- avisos --- */
  T("avisar", "Manda un aviso/recordatorio directo a una persona: le llega como notificación push al dispositivo y a su inbox.", {
    persona: S("Destinatario: Lucila o Demian"), titulo: S("Título corto del aviso (podés usar emoji)"),
    cuerpo: S("Detalle opcional"), de: S("Quién lo manda"),
  }, ["persona", "titulo"]),
  T("ver_notificaciones", "Inbox de notificaciones de una persona (por defecto solo las no leídas).", {
    persona: S("Lucila o Demian"), incluir_leidas: { type: "boolean", description: "true para ver también las leídas" },
  }, ["persona"]),
];

async function ejecutar(name: string, args: any): Promise<string> {
  const db = supa();

  switch (name) {
    /* ------------------------------ agenda ------------------------------ */
    case "ver_agenda": {
      const fecha = args?.fecha || hoyAR();
      const quien = args?.persona ? await perfil(db, args.persona) : null;
      let q = db.from("tasks").select("id,title,status,priority,start_date,start_time,end_time,due_date,due_time,assignee_id")
        .or(`start_date.eq.${fecha},due_date.eq.${fecha}`);
      if (quien) q = q.eq("assignee_id", quien.id);
      const [rT, nombres, rE] = await Promise.all([
        q.order("start_time", { ascending: true, nullsFirst: false }),
        nombresPorId(db),
        db.from("events").select("id,title,description,starts_at,ends_at,all_day")
          .gte("starts_at", `${fecha}T00:00:00-03:00`).lte("starts_at", `${fecha}T23:59:59-03:00`),
      ]);
      const tareas = chk(rT); const eventos = chk(rE);
      const lt = (tareas ?? []).map((t) => lineaTarea({ ...t, assignee: t.assignee_id ? nombres[t.assignee_id] : null }));
      const le = (eventos ?? []).map((e) => lineaEvento(e, false));
      return [
        `Agenda del ${fecha}${quien ? ` · ${quien.name}` : " · equipo"}`,
        le.length ? `\nEventos:\n${le.join("\n")}` : "",
        lt.length ? `\nTareas:\n${lt.join("\n")}` : "\nSin tareas para ese día.",
      ].filter(Boolean).join("\n");
    }

    case "resumen_semana": {
      const base = new Date(`${args?.fecha || hoyAR()}T12:00:00Z`);
      const dow = (base.getUTCDay() + 6) % 7; // lunes = 0
      const lunes = new Date(base.getTime() - dow * 86400000).toISOString().slice(0, 10);
      const domingo = new Date(base.getTime() + (6 - dow) * 86400000).toISOString().slice(0, 10);
      const [rT, nombres, rE] = await Promise.all([
        db.from("tasks").select("id,title,status,priority,start_date,start_time,end_time,due_date,due_time,assignee_id")
          .or(`and(start_date.gte.${lunes},start_date.lte.${domingo}),and(due_date.gte.${lunes},due_date.lte.${domingo})`),
        nombresPorId(db),
        db.from("events").select("id,title,description,starts_at,ends_at,all_day")
          .gte("starts_at", `${lunes}T00:00:00-03:00`).lte("starts_at", `${domingo}T23:59:59-03:00`).order("starts_at"),
      ]);
      const tareas = chk(rT) ?? []; const eventos = chk(rE) ?? [];
      const porPersona = new Map<string, any[]>();
      for (const t of tareas) {
        const n = t.assignee_id ? nombres[t.assignee_id] ?? "Sin asignar" : "Sin asignar";
        (porPersona.get(n) ?? porPersona.set(n, []).get(n)!).push(t);
      }
      const secciones = [...porPersona.entries()].map(([n, ts]) => {
        ts.sort((a, b) => `${a.start_date ?? a.due_date}${a.start_time ?? ""}`.localeCompare(`${b.start_date ?? b.due_date}${b.start_time ?? ""}`));
        const hechas = ts.filter((t) => t.status === "done").length;
        return `\n${n} (${hechas}/${ts.length} hechas):\n${ts.map((t) => lineaTarea(t)).join("\n")}`;
      });
      return [
        `Semana del ${lunes} al ${domingo}`,
        eventos.length ? `\nEventos:\n${eventos.map((e) => lineaEvento(e, false)).join("\n")}` : "",
        ...secciones,
        !tareas.length ? "\nSin tareas esta semana." : "",
      ].filter(Boolean).join("\n");
    }

    /* ------------------------------ tareas ------------------------------ */
    case "buscar_tareas": {
      let q = db.from("tasks").select("id,title,status,priority,start_date,start_time,end_time,due_date,due_time,assignee_id");
      if (args?.texto) q = q.ilike("title", `%${args.texto}%`);
      if (args?.estado) {
        const st = ESTADOS[String(args.estado).toLowerCase()];
        if (!st) throw new Error(`Estado inválido: "${args.estado}" (pendiente | en progreso | hecha).`);
        q = q.eq("status", st);
      }
      if (args?.persona) q = q.eq("assignee_id", (await perfil(db, args.persona))!.id);
      if (args?.proyecto) q = q.eq("project_id", (await proyecto(db, args.proyecto))!.id);
      const tareas = chk(await q.order("created_at", { ascending: false }).limit(args?.limite ?? 15));
      if (!tareas?.length) return "No encontré tareas con esos filtros.";
      const nombres = await nombresPorId(db);
      return tareas.map((t) => lineaTarea({ ...t, assignee: t.assignee_id ? nombres[t.assignee_id] : null })).join("\n");
    }

    case "ver_tarea": {
      const rows = chk(await db.from("tasks")
        .select("*, task_tags(tags(name,color))")
        .eq("id", args.id).limit(1)) as any[];
      if (!rows?.length) throw new Error("No existe esa tarea.");
      const t = rows[0];
      const nombres = await nombresPorId(db);
      const [rSub, rCom, rProy] = await Promise.all([
        db.from("tasks").select("id,title,status").eq("parent_task_id", t.id),
        db.from("comments").select("author_id,body,created_at").eq("target_type", "task").eq("target_id", t.id).order("created_at"),
        t.project_id ? db.from("projects").select("name,emoji").eq("id", t.project_id).limit(1) : Promise.resolve({ data: null, error: null } as any),
      ]);
      const subs = chk(rSub) ?? []; const coms = chk(rCom) ?? []; const proy = (rProy.data ?? [])[0];
      const tags = (t.task_tags ?? []).map((x: any) => x.tags?.name).filter(Boolean);
      return [
        lineaTarea({ ...t, assignee: t.assignee_id ? nombres[t.assignee_id] : null }),
        proy ? `Proyecto: ${proy.emoji ?? ""} ${proy.name}` : "",
        tags.length ? `Etiquetas: ${tags.join(", ")}` : "",
        t.description ? `\nDescripción:\n${t.description}` : "",
        subs.length ? `\nSubtareas:\n${subs.map((s) => `${s.status === "done" ? "✅" : "⚪"} ${s.title} · id:${s.id}`).join("\n")}` : "",
        coms.length ? `\nComentarios:\n${coms.map((c) => `— ${nombres[c.author_id ?? ""] ?? "?"}: ${c.body}`).join("\n")}` : "",
      ].filter(Boolean).join("\n");
    }

    case "crear_tarea": {
      if (!args?.titulo) throw new Error("Falta el título.");
      const pide = args.de ? await perfil(db, args.de) : null;
      // Sin persona explícita, la tarea es de quien la pide (lo más común al
      // dictarle a Claude). "nadie"/"sin asignar" la deja libre a propósito.
      const asignada =
        args.persona && SIN_ASIGNAR.has(norm(String(args.persona)))
          ? null
          : args.persona
            ? await perfil(db, args.persona)
            : pide;
      const proy = args.proyecto ? await proyecto(db, args.proyecto) : null;
      const fila: any = {
        title: args.titulo,
        description: args.descripcion ?? null,
        status: "todo",
        priority: args.prioridad ? (PRIORIDADES[String(args.prioridad).toLowerCase()] ?? "none") : "none",
        assignee_id: asignada?.id ?? null,
        project_id: proy?.id ?? null,
        parent_task_id: args.subtarea_de ?? null,
        start_date: args.fecha ?? null,
        start_time: normHora(args.hora_inicio),
        end_time: normHora(args.hora_fin),
        due_date: args.fecha_entrega ?? null,
        due_time: normHora(args.hora_entrega),
        created_by: pide?.id ?? asignada?.id ?? null,
      };
      const { data, error } = await db.from("tasks").insert(fila).select("id,title").single();
      if (error) throw new Error(error.message);
      const puestas: string[] = [];
      for (const nombre of args.etiquetas ?? []) {
        const tag = chk(await db.from("tags").select("id,name").ilike("name", `%${nombre}%`).limit(1));
        if (tag?.length) {
          await db.from("task_tags").insert({ task_id: data.id, tag_id: tag[0].id });
          puestas.push(tag[0].name);
        }
      }
      if (asignada && asignada.id !== pide?.id) {
        await notificar(db, {
          recipient_id: asignada.id, actor_id: pide?.id ?? null, type: "assigned",
          title: `📌 ${data.title}`, body: "Nueva tarea asignada para vos (vía Claude)",
          target_type: "task", target_id: data.id,
        });
      }
      return `Tarea creada ✓ "${data.title}" (id:${data.id})${asignada ? ` · asignada a ${asignada.name}` : " · ⚠️ SIN ASIGNAR — si era para alguien, corregilo con actualizar_tarea pasando persona: \"Lucila\" o \"Demian\""}${proy ? ` · proyecto ${proy.name}` : ""}${puestas.length ? ` · etiquetas: ${puestas.join(", ")}` : ""}`;
    }

    case "actualizar_tarea": {
      if (!args?.id) throw new Error("Falta el id (usá buscar_tareas).");
      const pide = args.de ? await perfil(db, args.de) : null;
      const patch: any = {};
      let reasignadaA: { id: string; name: string } | null = null;
      if (args.estado) {
        const st = ESTADOS[String(args.estado).toLowerCase()];
        if (!st) throw new Error(`Estado inválido: "${args.estado}".`);
        patch.status = st;
        patch.completed_at = st === "done" ? new Date().toISOString() : null;
      }
      if (args.titulo) patch.title = args.titulo;
      if (args.descripcion !== undefined) patch.description = args.descripcion;
      if (args.persona) { reasignadaA = (await perfil(db, args.persona))!; patch.assignee_id = reasignadaA.id; }
      if (args.proyecto) patch.project_id = (await proyecto(db, args.proyecto))!.id;
      if (args.fecha) patch.start_date = args.fecha;
      if (args.hora_inicio) patch.start_time = normHora(args.hora_inicio);
      if (args.hora_fin) patch.end_time = normHora(args.hora_fin);
      if (args.fecha_entrega) patch.due_date = args.fecha_entrega;
      if (args.hora_entrega) patch.due_time = normHora(args.hora_entrega);
      if (args.prioridad) patch.priority = PRIORIDADES[String(args.prioridad).toLowerCase()] ?? "none";
      if (!Object.keys(patch).length) throw new Error("No pasaste ningún campo para cambiar.");
      const { data, error } = await db.from("tasks").update(patch).eq("id", args.id).select("id,title,status").single();
      if (error) throw new Error(error.message);
      if (reasignadaA && reasignadaA.id !== pide?.id) {
        await notificar(db, {
          recipient_id: reasignadaA.id, actor_id: pide?.id ?? null, type: "assigned",
          title: `📌 ${data.title}`, body: "Te asignaron esta tarea (vía Claude)",
          target_type: "task", target_id: data.id,
        });
      }
      return `Tarea actualizada ✓ "${data.title}" · estado: ${estadoLabel[data.status] ?? data.status}`;
    }

    case "eliminar_tarea": {
      const rows = chk(await db.from("tasks").select("id,title").eq("id", args.id).limit(1));
      if (!rows?.length) throw new Error("No existe esa tarea.");
      await db.from("task_tags").delete().eq("task_id", args.id);
      await db.from("comments").delete().eq("target_type", "task").eq("target_id", args.id);
      await db.from("tasks").update({ parent_task_id: null }).eq("parent_task_id", args.id);
      const { error } = await db.from("tasks").delete().eq("id", args.id);
      if (error) throw new Error(error.message);
      return `Tarea eliminada ✓ "${rows[0].title}"`;
    }

    case "comentar_tarea": {
      const autor = await perfil(db, args.de);
      const rows = chk(await db.from("tasks").select("id,title,assignee_id").eq("id", args.id).limit(1));
      if (!rows?.length) throw new Error("No existe esa tarea.");
      const { error } = await db.from("comments").insert({
        target_type: "task", target_id: args.id, author_id: autor!.id, body: args.texto,
      });
      if (error) throw new Error(error.message);
      const t = rows[0];
      if (t.assignee_id && t.assignee_id !== autor!.id) {
        await notificar(db, {
          recipient_id: t.assignee_id, actor_id: autor!.id, type: "comment",
          title: `💬 ${autor!.name} comentó "${t.title}"`, body: args.texto,
          target_type: "task", target_id: t.id,
        });
      }
      return `Comentario agregado ✓ en "${t.title}".`;
    }

    case "etiquetar_tarea": {
      const rows = chk(await db.from("tasks").select("id,title").eq("id", args.id).limit(1));
      if (!rows?.length) throw new Error("No existe esa tarea.");
      const hechas: string[] = [];
      for (const nombre of args.agregar ?? []) {
        const tag = chk(await db.from("tags").select("id,name").ilike("name", `%${nombre}%`).limit(1));
        if (!tag?.length) { hechas.push(`(no existe "${nombre}")`); continue; }
        await db.from("task_tags").delete().eq("task_id", args.id).eq("tag_id", tag[0].id);
        await db.from("task_tags").insert({ task_id: args.id, tag_id: tag[0].id });
        hechas.push(`+${tag[0].name}`);
      }
      for (const nombre of args.quitar ?? []) {
        const tag = chk(await db.from("tags").select("id,name").ilike("name", `%${nombre}%`).limit(1));
        if (!tag?.length) continue;
        await db.from("task_tags").delete().eq("task_id", args.id).eq("tag_id", tag[0].id);
        hechas.push(`−${tag[0].name}`);
      }
      return `Etiquetas de "${rows[0].title}": ${hechas.join(", ") || "sin cambios"}`;
    }

    /* ------------------------------ rutina ------------------------------ */
    case "ver_rutina": {
      const quien = (await perfil(db, args?.persona))!;
      const fecha = args?.fecha || hoyAR();
      const todos = chk(await db.from("routine_blocks").select("*").eq("profile_id", quien.id)) ?? [];
      const delDia = todos
        .filter((b: any) => occursOn(b, fecha))
        .sort((a: any, b: any) => toMin(a.start_time) - toMin(b.start_time));
      if (!delDia.length) return `${quien.name} no tiene bloques de rutina el ${fecha}.`;
      const horas = delDia.reduce((acc: number, b: any) => acc + (toMin(b.end_time) - toMin(b.start_time)), 0);
      return [
        `Rutina de ${quien.name} · ${fecha} (${Math.round((horas / 60) * 10) / 10} h agendadas)`,
        ...delDia.map((b: any) => lineaBloque(b)),
      ].join("\n");
    }

    case "crear_bloque_rutina": {
      const quien = (await perfil(db, args?.persona))!;
      const pide = args?.de ? await perfil(db, args.de) : null;
      const area = normArea(args?.area);
      const inicio = normHora(args?.hora_inicio);
      const fin = normHora(args?.hora_fin);
      if (!args?.fecha) throw new Error("Falta la fecha (YYYY-MM-DD).");
      if (!inicio || !fin) throw new Error("Faltan hora_inicio y hora_fin (HH:MM).");
      if (toMin(fin) <= toMin(inicio)) throw new Error("La hora de fin tiene que ser posterior a la de inicio.");
      const { data, error } = await db.from("routine_blocks").insert({
        profile_id: quien.id,
        area,
        title: args.titulo,
        code: args.sigla ? String(args.sigla).toUpperCase() : null,
        notes: args.notas ?? null,
        date: args.fecha,
        start_time: inicio,
        end_time: fin,
        repeat_rule: normRepeticion(args.repetir),
        repeat_until: args.repetir_hasta ?? null,
        created_by: pide?.id ?? quien.id,
      }).select("*").single();
      if (error) throw new Error(error.message);
      const meta = ROUTINE_AREAS[area];
      const fuera = meta.window && (toMin(inicio) < meta.window[0] || toMin(inicio) >= meta.window[1])
        ? ` · ⚠️ ojo: ${meta.label.toLowerCase()} rinde entre ${String(Math.floor(meta.window[0] / 60)).padStart(2, "0")}:00 y ${String(Math.floor(meta.window[1] / 60)).padStart(2, "0")}:00`
        : "";
      return `Bloque agendado ✓ en la rutina de ${quien.name} · ${args.fecha}\n${lineaBloque(data)}${fuera}`;
    }

    case "actualizar_bloque_rutina": {
      if (!args?.id) throw new Error("Falta el id del bloque (usá ver_rutina).");
      const patch: any = {};
      if (args.titulo) patch.title = args.titulo;
      if (args.area) patch.area = normArea(args.area);
      if (args.fecha) patch.date = args.fecha;
      if (args.hora_inicio) patch.start_time = normHora(args.hora_inicio);
      if (args.hora_fin) patch.end_time = normHora(args.hora_fin);
      if (args.sigla !== undefined) patch.code = args.sigla ? String(args.sigla).toUpperCase() : null;
      if (args.notas !== undefined) patch.notes = args.notas;
      if (args.repetir) patch.repeat_rule = normRepeticion(args.repetir);
      if (args.hecho !== undefined) patch.done = Boolean(args.hecho);
      if (!Object.keys(patch).length) throw new Error("No mandaste ningún cambio.");
      const { data, error } = await db.from("routine_blocks").update(patch).eq("id", args.id).select("*").single();
      if (error) throw new Error(error.message);
      return `Bloque actualizado ✓\n${lineaBloque(data)}`;
    }

    case "eliminar_bloque_rutina": {
      if (!args?.id) throw new Error("Falta el id del bloque.");
      const previo = chk(await db.from("routine_blocks").select("title").eq("id", args.id).limit(1));
      if (!previo?.length) throw new Error("No existe ese bloque.");
      const { error } = await db.from("routine_blocks").delete().eq("id", args.id);
      if (error) throw new Error(error.message);
      return `Bloque eliminado 🗑️ "${previo[0].title}"`;
    }

    /* ------------------------------ etiquetas ------------------------------ */
    case "listar_etiquetas": {
      const data = chk(await db.from("tags").select("id,name,color").order("name"));
      return (data ?? []).map((t) => `🏷️ ${t.name} (${t.color})`).join("\n") || "No hay etiquetas.";
    }

    case "crear_etiqueta": {
      if (!args?.nombre) throw new Error("Falta el nombre.");
      const existe = chk(await db.from("tags").select("id").ilike("name", args.nombre).limit(1));
      if (existe?.length) return `Ya existe una etiqueta "${args.nombre}".`;
      const color = args.color ?? PASTELS[Math.floor(Math.random() * PASTELS.length)];
      const { data, error } = await db.from("tags").insert({ name: args.nombre, color }).select("name,color").single();
      if (error) throw new Error(error.message);
      return `Etiqueta creada ✓ ${data.name} (${data.color})`;
    }

    /* ------------------------------ proyectos ------------------------------ */
    case "listar_proyectos": {
      const proys = chk(await db.from("projects").select("id,name,emoji,client_name,archived").order("sort_order"));
      if (!proys?.length) return "No hay proyectos.";
      const abiertas = chk(await db.from("tasks").select("project_id").neq("status", "done").not("project_id", "is", null));
      const conteo: Record<string, number> = {};
      for (const t of abiertas ?? []) conteo[t.project_id!] = (conteo[t.project_id!] ?? 0) + 1;
      return proys.map((p) =>
        `${p.emoji ?? "📁"} ${p.name}${p.client_name ? ` · cliente: ${p.client_name}` : ""} · ${conteo[p.id] ?? 0} tareas abiertas${p.archived ? " · (archivado)" : ""} · id:${p.id}`
      ).join("\n");
    }

    case "ver_proyecto": {
      const proy = await proyecto(db, args.nombre_o_id);
      const tareas = chk(await db.from("tasks").select("id,title,status,priority,start_date,due_date,due_time,assignee_id")
        .eq("project_id", proy!.id).order("sort_order"));
      const nombres = await nombresPorId(db);
      const grupos: Record<string, any[]> = { todo: [], in_progress: [], done: [] };
      for (const t of tareas ?? []) (grupos[t.status] ?? (grupos[t.status] = [])).push(t);
      const seccion = (st: string, label: string) =>
        grupos[st]?.length ? `\n${label}:\n${grupos[st].map((t) => lineaTarea({ ...t, assignee: t.assignee_id ? nombres[t.assignee_id] : null })).join("\n")}` : "";
      return `${proy!.emoji ?? "📁"} ${proy!.name} · ${tareas?.length ?? 0} tareas` +
        seccion("in_progress", "En progreso") + seccion("todo", "Pendientes") + seccion("done", "Hechas");
    }

    case "crear_proyecto": {
      if (!args?.nombre) throw new Error("Falta el nombre.");
      const pide = args.de ? await perfil(db, args.de) : null;
      const color = args.color ?? PASTELS[Math.floor(Math.random() * PASTELS.length)];
      const { data, error } = await db.from("projects").insert({
        name: args.nombre, emoji: args.emoji ?? "📁", color,
        client_name: args.cliente ?? null, description: args.descripcion ?? null,
        created_by: pide?.id ?? null,
      }).select("id,name,emoji").single();
      if (error) throw new Error(error.message);
      return `Proyecto creado ✓ ${data.emoji} ${data.name} (id:${data.id})`;
    }

    /* ------------------------------ eventos ------------------------------ */
    case "listar_eventos": {
      const desde = args?.desde || hoyAR();
      const dias = args?.dias ?? 14;
      const hasta = new Date(new Date(`${desde}T12:00:00Z`).getTime() + dias * 86400000).toISOString().slice(0, 10);
      const eventos = chk(await db.from("events").select("id,title,description,starts_at,ends_at,all_day")
        .gte("starts_at", `${desde}T00:00:00-03:00`).lte("starts_at", `${hasta}T23:59:59-03:00`).order("starts_at"));
      if (!eventos?.length) return `Sin eventos entre ${desde} y ${hasta}.`;
      return eventos.map((e) => lineaEvento(e)).join("\n");
    }

    case "crear_evento": {
      if (!args?.titulo || !args?.fecha) throw new Error("Faltan título o fecha.");
      const todoElDia = !!args.todo_el_dia || !args.hora_inicio;
      const hi = normHora(args.hora_inicio) ?? "09:00";
      const hf = normHora(args.hora_fin);
      const { data, error } = await db.from("events").insert({
        title: args.titulo,
        description: args.descripcion ?? null,
        starts_at: new Date(`${args.fecha}T${todoElDia ? "00:00" : hi}:00-03:00`).toISOString(),
        ends_at: hf ? new Date(`${args.fecha}T${hf}:00-03:00`).toISOString() : null,
        all_day: todoElDia,
      }).select("id,title").single();
      if (error) throw new Error(error.message);
      return `Evento creado ✓ "${data.title}" el ${args.fecha}${todoElDia ? " (todo el día)" : ` ${hi}${hf ? `–${hf}` : ""}`} (id:${data.id})`;
    }

    case "actualizar_evento": {
      const rows = chk(await db.from("events").select("*").eq("id", args.id).limit(1));
      if (!rows?.length) throw new Error("No existe ese evento.");
      const ev = rows[0];
      const fecha = args.fecha ?? fechaAR(ev.starts_at);
      const patch: any = {};
      if (args.titulo) patch.title = args.titulo;
      if (args.descripcion !== undefined) patch.description = args.descripcion;
      if (args.fecha || args.hora_inicio) {
        const hi = normHora(args.hora_inicio) ?? (ev.all_day ? "00:00" : horaAR(ev.starts_at));
        patch.starts_at = new Date(`${fecha}T${hi}:00-03:00`).toISOString();
        if (args.hora_inicio) patch.all_day = false;
      }
      if (args.hora_fin) patch.ends_at = new Date(`${fecha}T${normHora(args.hora_fin)}:00-03:00`).toISOString();
      if (!Object.keys(patch).length) throw new Error("No pasaste ningún campo para cambiar.");
      const { data, error } = await db.from("events").update(patch).eq("id", args.id).select("id,title,starts_at,ends_at,all_day,description").single();
      if (error) throw new Error(error.message);
      return `Evento actualizado ✓ ${lineaEvento(data, false)}`;
    }

    case "eliminar_evento": {
      const rows = chk(await db.from("events").select("id,title").eq("id", args.id).limit(1));
      if (!rows?.length) throw new Error("No existe ese evento.");
      const { error } = await db.from("events").delete().eq("id", args.id);
      if (error) throw new Error(error.message);
      return `Evento eliminado ✓ "${rows[0].title}"`;
    }

    /* ------------------------------ docs ------------------------------ */
    case "listar_docs": {
      const data = chk(await db.from("docs").select("id,title,icon,updated_at").order("updated_at", { ascending: false }).limit(30));
      if (!data?.length) return "No hay documentos todavía.";
      return data.map((d) => `${d.icon ?? "📄"} ${d.title} · id:${d.id}`).join("\n");
    }

    case "leer_doc": {
      const d = await buscarDoc(db, String(args?.id_o_titulo ?? "").trim());
      return `${d.icon ?? "📄"} ${d.title} (id:${d.id})\n\n${bloquesATexto(d.content)}`;
    }

    case "crear_doc": {
      if (!args?.titulo || !args?.contenido_markdown) throw new Error("Faltan título o contenido.");
      const pide = args.de ? await perfil(db, args.de) : null;
      const { data, error } = await db.from("docs").insert({
        title: args.titulo,
        icon: args.icono ?? "📝",
        content: mdABloques(args.contenido_markdown),
        created_by: pide?.id ?? null,
      }).select("id,title").single();
      if (error) throw new Error(error.message);
      return `Doc creado ✓ "${data.title}" (id:${data.id}). Lo ven en la sección Docs.`;
    }

    case "agregar_a_doc": {
      const d = await buscarDoc(db, String(args?.id_o_titulo ?? "").trim());
      const actual = Array.isArray(d.content) ? (d.content as any[]) : [];
      const nuevo = [...actual, ...mdABloques(args.contenido_markdown)];
      const { error } = await db.from("docs").update({ content: nuevo, updated_at: new Date().toISOString() }).eq("id", d.id);
      if (error) throw new Error(error.message);
      return `Contenido agregado ✓ al final de "${d.title}".`;
    }

    case "eliminar_doc": {
      const rows = chk(await db.from("docs").select("id,title").eq("id", args.id).limit(1));
      if (!rows?.length) throw new Error("No existe ese doc.");
      const { error } = await db.from("docs").delete().eq("id", args.id);
      if (error) throw new Error(error.message);
      return `Doc eliminado ✓ "${rows[0].title}"`;
    }

    /* ------------------------------ chat ------------------------------ */
    case "leer_chat": {
      const canal = await buscarCanal(db, String(args?.canal ?? ""));
      const msgs = chk(await db.from("messages").select("author_id,body,created_at")
        .eq("channel_id", canal.id).is("deleted_at", null)
        .order("created_at", { ascending: false }).limit(args?.cantidad ?? 20));
      if (!msgs?.length) return `El canal ${canal.name} está vacío.`;
      const nombres = await nombresPorId(db);
      return `Últimos mensajes de ${canal.name}:\n` + msgs.reverse().map((m) =>
        `[${horaAR(m.created_at)} ${fechaAR(m.created_at)}] ${nombres[m.author_id ?? ""] ?? "?"}: ${m.body ?? ""}`
      ).join("\n");
    }

    case "enviar_mensaje": {
      if (!args?.canal || !args?.texto || !args?.de) throw new Error("Faltan canal, texto o quién lo manda (de).");
      const autor = await perfil(db, args.de);
      const canal = await buscarCanal(db, String(args.canal));
      const { error } = await db.from("messages").insert({ channel_id: canal.id, author_id: autor!.id, body: args.texto });
      if (error) throw new Error(error.message);
      if (canal.kind === "dm") {
        const otros = chk(await db.from("profiles").select("id,name").neq("id", autor!.id));
        for (const o of otros ?? []) {
          await notificar(db, {
            recipient_id: o.id, actor_id: autor!.id, type: "message",
            title: `💬 ${autor!.name}`, body: args.texto,
            target_type: "channel", target_id: canal.id,
          });
        }
      }
      return `Mensaje enviado ✓ a ${canal.name} como ${autor!.name}.`;
    }

    /* ------------------------------ avisos ------------------------------ */
    case "avisar": {
      const destino = await perfil(db, args.persona);
      const pide = args.de ? await perfil(db, args.de) : null;
      await notificar(db, {
        recipient_id: destino!.id, actor_id: pide?.id ?? null, type: "reminder",
        title: args.titulo, body: args.cuerpo ?? null,
      });
      return `Aviso enviado ✓ a ${destino!.name}: "${args.titulo}". Le llega como notificación push al dispositivo.`;
    }

    case "ver_notificaciones": {
      const quien = await perfil(db, args.persona);
      let q = db.from("notifications").select("title,body,type,read_at,created_at")
        .eq("recipient_id", quien!.id).order("created_at", { ascending: false }).limit(15);
      if (!args?.incluir_leidas) q = q.is("read_at", null);
      const data = chk(await q);
      if (!data?.length) return `${quien!.name} no tiene notificaciones${args?.incluir_leidas ? "" : " sin leer"}. 🎉`;
      return data.map((n) => `${n.read_at ? "· " : "🔵 "}${n.title}${n.body ? ` — ${n.body}` : ""} (${fechaAR(n.created_at)} ${horaAR(n.created_at)})`).join("\n");
    }

    default:
      throw new Error(`Herramienta desconocida: ${name}`);
  }
}

/* ------------------------------ plomería JSON-RPC / MCP ------------------------------ */

const SUPPORTED_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
const rpcResult = (id: unknown, result: unknown) => ({ jsonrpc: "2.0", id, result });
const rpcError = (id: unknown, code: number, message: string) => ({ jsonrpc: "2.0", id, error: { code, message } });

async function atender(msg: any): Promise<object | null> {
  const { id, method, params } = msg ?? {};
  // notificaciones y respuestas del cliente: sin respuesta
  if (id === undefined || id === null) return null;

  switch (method) {
    case "initialize": {
      const pedida = params?.protocolVersion;
      return rpcResult(id, {
        protocolVersion: SUPPORTED_VERSIONS.includes(pedida) ? pedida : SUPPORTED_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "Atrio HQ", version: "2.0.0" },
        instructions:
          "Conector del HQ de Atrio (estudio de diseño de Lucila y Demian, Buenos Aires). " +
          "Opera toda la app: agenda y resumen semanal, tareas (crear, actualizar, eliminar, subtareas, comentarios, etiquetas), " +
          "rutina personal por bloques en 5 sub-calendarios (trabajo profundo 10–14, reuniones, administrativo, salud, social), " +
          "proyectos, eventos del calendario, documentos (crear/leer/agregar), chat interno y avisos push directos a cada persona. " +
          "Fechas en YYYY-MM-DD y horas HH:MM, siempre en hora de Buenos Aires (UTC-3). " +
          "Antes de eliminar algo, confirmá con el usuario. Cuando el usuario diga 'yo' o 'me', preguntale (o deducí) si es Lucila o Demian y usalo en el campo 'de'. " +
          "OJO con las tareas: 'persona' = a quién queda ASIGNADA (si dicen 'una tarea para Lucila', persona='Lucila'); 'de' = quién la pide. Si no pasás persona, se asigna a quien la pide.",
      });
    }
    case "ping":
      return rpcResult(id, {});
    case "tools/list":
      return rpcResult(id, { tools: TOOLS });
    case "tools/call": {
      try {
        const texto = await ejecutar(params?.name, params?.arguments ?? {});
        return rpcResult(id, { content: [{ type: "text", text: texto }], isError: false });
      } catch (e) {
        return rpcResult(id, { content: [{ type: "text", text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true });
      }
    }
    // sondas de capacidades que no ofrecemos: listas vacías (mejor que error)
    case "resources/list":
      return rpcResult(id, { resources: [] });
    case "prompts/list":
      return rpcResult(id, { prompts: [] });
    default:
      return rpcError(id, -32601, `Método no soportado: ${method}`);
  }
}

export async function POST(req: NextRequest, { params }: { params: { secret: string } }) {
  if (params.secret !== mcpSecret()) return new Response("No autorizado", { status: 401 });

  let cuerpo: any;
  try {
    cuerpo = await req.json();
  } catch {
    return json(rpcError(null, -32700, "JSON inválido"), 400);
  }

  if (Array.isArray(cuerpo)) {
    const respuestas = (await Promise.all(cuerpo.map(atender))).filter(Boolean);
    return respuestas.length ? json(respuestas) : new Response(null, { status: 202 });
  }
  const respuesta = await atender(cuerpo);
  return respuesta ? json(respuesta) : new Response(null, { status: 202 });
}

// Sin stream SSE (servidor stateless): GET/DELETE no aplican.
export async function GET() {
  return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
}
export async function DELETE() {
  return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
}
