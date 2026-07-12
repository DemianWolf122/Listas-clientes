import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { SCHEMA } from "@/lib/constants";
import { mcpSecret } from "@/lib/mcp-config";

/**
 * Servidor MCP de Atrio (Streamable HTTP, stateless) para los conectores
 * personalizados de claude.ai. Cada uno lo agrega en su claude.ai (Ajustes →
 * Conectores → agregar por URL) y Claude puede operar la app: agenda, tareas,
 * eventos, docs y chat. JSON-RPC 2.0 sobre POST; sin sesiones ni SSE.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const AR_OFFSET_MS = 3 * 3600 * 1000; // Buenos Aires: UTC-3 fijo
const hoyAR = () => new Date(Date.now() - AR_OFFSET_MS).toISOString().slice(0, 10);
const horaAR = (iso: string) => new Date(new Date(iso).getTime() - AR_OFFSET_MS).toISOString().slice(11, 16);

function supa() {
  return createClient<Database, typeof SCHEMA>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: SCHEMA } }
  );
}

/* ------------------------------ helpers de dominio ------------------------------ */

async function perfil(db: ReturnType<typeof supa>, nombre?: string | null) {
  if (!nombre) return null;
  const { data, error } = await db.from("profiles").select("id,name").ilike("name", `%${nombre.trim()}%`).limit(1);
  if (error) throw new Error(`Base de datos: ${error.message}`);
  if (!data?.length) throw new Error(`No encontré a "${nombre}" (probá "Lucila" o "Demian").`);
  return data[0];
}

const ESTADOS: Record<string, string> = {
  pendiente: "todo", todo: "todo",
  "en progreso": "in_progress", en_progreso: "in_progress", in_progress: "in_progress", doing: "in_progress",
  hecha: "done", hecho: "done", completada: "done", done: "done",
};
const PRIORIDADES: Record<string, string> = {
  ninguna: "none", none: "none", baja: "low", low: "low",
  media: "medium", medium: "medium", alta: "high", high: "high", urgente: "urgent", urgent: "urgent",
};
const estadoLabel: Record<string, string> = { todo: "pendiente", in_progress: "en progreso", done: "hecha ✓" };

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

/* ------------------------------ herramientas ------------------------------ */

const TOOLS = [
  {
    name: "ver_agenda",
    description: "Agenda de un día: tareas con horario/entrega y eventos del equipo. Por defecto hoy (Buenos Aires) y todo el equipo.",
    inputSchema: {
      type: "object",
      properties: {
        fecha: { type: "string", description: "YYYY-MM-DD (default: hoy en Buenos Aires)" },
        persona: { type: "string", description: "Filtrar por persona (Lucila o Demian). Vacío = equipo completo." },
      },
    },
  },
  {
    name: "buscar_tareas",
    description: "Busca tareas por texto, estado o persona. Devuelve los ids para poder actualizarlas.",
    inputSchema: {
      type: "object",
      properties: {
        texto: { type: "string", description: "Texto a buscar en el título" },
        estado: { type: "string", description: "pendiente | en progreso | hecha" },
        persona: { type: "string", description: "Lucila o Demian" },
        limite: { type: "number", description: "Máx. resultados (default 15)" },
      },
    },
  },
  {
    name: "crear_tarea",
    description: "Crea una tarea (con horario opcional para que aparezca en la agenda). Notifica al asignado si no es quien la pide.",
    inputSchema: {
      type: "object",
      properties: {
        titulo: { type: "string", description: "Título (podés arrancar con un emoji)" },
        persona: { type: "string", description: "Asignada a: Lucila o Demian" },
        fecha: { type: "string", description: "Día del bloque de trabajo (YYYY-MM-DD)" },
        hora_inicio: { type: "string", description: "HH:MM" },
        hora_fin: { type: "string", description: "HH:MM" },
        fecha_entrega: { type: "string", description: "Fecha límite (YYYY-MM-DD)" },
        hora_entrega: { type: "string", description: "HH:MM" },
        descripcion: { type: "string" },
        prioridad: { type: "string", description: "baja | media | alta" },
        etiquetas: { type: "array", items: { type: "string" }, description: "Nombres de etiquetas existentes (Cliente, Diseño, Dev, Urgente, Idea)" },
        de: { type: "string", description: "Quién la pide (Lucila o Demian), para saber si avisar al asignado" },
      },
      required: ["titulo"],
    },
  },
  {
    name: "actualizar_tarea",
    description: "Actualiza una tarea por id (estado, horarios, asignado, título…). Usá buscar_tareas para conseguir el id.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        estado: { type: "string", description: "pendiente | en progreso | hecha" },
        titulo: { type: "string" },
        descripcion: { type: "string" },
        persona: { type: "string", description: "Reasignar a Lucila o Demian" },
        fecha: { type: "string", description: "YYYY-MM-DD" },
        hora_inicio: { type: "string" },
        hora_fin: { type: "string" },
        fecha_entrega: { type: "string" },
        hora_entrega: { type: "string" },
        prioridad: { type: "string" },
      },
      required: ["id"],
    },
  },
  {
    name: "crear_evento",
    description: "Crea un evento de equipo en el calendario (les avisa a los dos cuando está por empezar).",
    inputSchema: {
      type: "object",
      properties: {
        titulo: { type: "string" },
        fecha: { type: "string", description: "YYYY-MM-DD" },
        hora_inicio: { type: "string", description: "HH:MM (omitir si es todo el día)" },
        hora_fin: { type: "string", description: "HH:MM" },
        descripcion: { type: "string" },
        todo_el_dia: { type: "boolean" },
      },
      required: ["titulo", "fecha"],
    },
  },
  {
    name: "listar_docs",
    description: "Lista los documentos del estudio (título + id).",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "leer_doc",
    description: "Lee un documento por id o por título (devuelve el contenido como texto).",
    inputSchema: {
      type: "object",
      properties: { id_o_titulo: { type: "string" } },
      required: ["id_o_titulo"],
    },
  },
  {
    name: "crear_doc",
    description: "Crea un documento en Docs a partir de markdown simple (#/##/### títulos, - bullets, 1. listas).",
    inputSchema: {
      type: "object",
      properties: {
        titulo: { type: "string" },
        contenido_markdown: { type: "string" },
        icono: { type: "string", description: "Un emoji para el doc (ej. 📝)" },
        de: { type: "string", description: "Quién lo crea (Lucila o Demian)" },
      },
      required: ["titulo", "contenido_markdown"],
    },
  },
  {
    name: "enviar_mensaje",
    description: "Manda un mensaje al chat de Atrio. Canales: general, estudio-botanico, dm (Lucila & Demian).",
    inputSchema: {
      type: "object",
      properties: {
        canal: { type: "string", description: "general | estudio-botanico | dm" },
        texto: { type: "string" },
        de: { type: "string", description: "Quién lo manda (Lucila o Demian)" },
      },
      required: ["canal", "texto", "de"],
    },
  },
];

async function ejecutar(name: string, args: any): Promise<string> {
  const db = supa();

  switch (name) {
    case "ver_agenda": {
      const fecha = args?.fecha || hoyAR();
      const quien = args?.persona ? await perfil(db, args.persona) : null;
      let q = db.from("tasks").select("id,title,status,priority,start_date,start_time,end_time,due_date,due_time,assignee_id")
        .or(`start_date.eq.${fecha},due_date.eq.${fecha}`);
      if (quien) q = q.eq("assignee_id", quien.id);
      const [rTareas, { data: perfiles }, { data: eventos }] = await Promise.all([
        q.order("start_time", { ascending: true, nullsFirst: false }),
        db.from("profiles").select("id,name"),
        db.from("events").select("id,title,description,starts_at,ends_at,all_day")
          .gte("starts_at", `${fecha}T00:00:00-03:00`).lte("starts_at", `${fecha}T23:59:59-03:00`),
      ]);
      if (rTareas.error) throw new Error(`Base de datos: ${rTareas.error.message}`);
      const tareas = rTareas.data;
      const nombres = Object.fromEntries((perfiles ?? []).map((p) => [p.id, p.name]));
      const lt = (tareas ?? []).map((t) => lineaTarea({ ...t, assignee: t.assignee_id ? nombres[t.assignee_id] : null }));
      const le = (eventos ?? []).map((e) =>
        `📅 ${e.title} ${e.all_day ? "· todo el día" : `· ${horaAR(e.starts_at)}${e.ends_at ? `–${horaAR(e.ends_at)}` : ""}`}${e.description ? ` — ${e.description}` : ""}`
      );
      return [
        `Agenda del ${fecha}${quien ? ` · ${quien.name}` : " · equipo"}`,
        le.length ? `\nEventos:\n${le.join("\n")}` : "",
        lt.length ? `\nTareas:\n${lt.join("\n")}` : "\nSin tareas para ese día.",
      ].filter(Boolean).join("\n");
    }

    case "buscar_tareas": {
      let q = db.from("tasks").select("id,title,status,priority,start_date,start_time,end_time,due_date,due_time,assignee_id");
      if (args?.texto) q = q.ilike("title", `%${args.texto}%`);
      if (args?.estado) {
        const st = ESTADOS[String(args.estado).toLowerCase()];
        if (!st) throw new Error(`Estado inválido: "${args.estado}" (pendiente | en progreso | hecha).`);
        q = q.eq("status", st);
      }
      if (args?.persona) q = q.eq("assignee_id", (await perfil(db, args.persona))!.id);
      const { data: tareas, error: eBusq } = await q.order("created_at", { ascending: false }).limit(args?.limite ?? 15);
      if (eBusq) throw new Error(`Base de datos: ${eBusq.message}`);
      if (!tareas?.length) return "No encontré tareas con esos filtros.";
      const { data: perfiles } = await db.from("profiles").select("id,name");
      const nombres = Object.fromEntries((perfiles ?? []).map((p) => [p.id, p.name]));
      return tareas.map((t) => lineaTarea({ ...t, assignee: t.assignee_id ? nombres[t.assignee_id] : null })).join("\n");
    }

    case "crear_tarea": {
      if (!args?.titulo) throw new Error("Falta el título.");
      const asignada = args.persona ? await perfil(db, args.persona) : null;
      const pide = args.de ? await perfil(db, args.de) : null;
      const fila: any = {
        title: args.titulo,
        description: args.descripcion ?? null,
        status: "todo",
        priority: args.prioridad ? (PRIORIDADES[String(args.prioridad).toLowerCase()] ?? "none") : "none",
        assignee_id: asignada?.id ?? null,
        start_date: args.fecha ?? null,
        start_time: normHora(args.hora_inicio),
        end_time: normHora(args.hora_fin),
        due_date: args.fecha_entrega ?? null,
        due_time: normHora(args.hora_entrega),
        created_by: pide?.id ?? asignada?.id ?? null,
      };
      const { data, error } = await db.from("tasks").insert(fila).select("id,title").single();
      if (error) throw new Error(error.message);
      // etiquetas por nombre
      const puestas: string[] = [];
      for (const nombre of args.etiquetas ?? []) {
        const { data: tag } = await db.from("tags").select("id,name").ilike("name", `%${nombre}%`).limit(1);
        if (tag?.length) {
          await db.from("task_tags").insert({ task_id: data.id, tag_id: tag[0].id });
          puestas.push(tag[0].name);
        }
      }
      // avisar al asignado (mismo criterio que la app: no si se la asigna a sí mismo)
      if (asignada && asignada.id !== pide?.id) {
        await db.from("notifications").insert({
          recipient_id: asignada.id, actor_id: pide?.id ?? null, type: "assigned",
          title: `📌 ${data.title}`, body: "Nueva tarea asignada para vos (vía Claude)",
          target_type: "task", target_id: data.id,
        });
      }
      return `Tarea creada ✓ "${data.title}" (id:${data.id})${asignada ? ` · asignada a ${asignada.name}` : ""}${puestas.length ? ` · etiquetas: ${puestas.join(", ")}` : ""}`;
    }

    case "actualizar_tarea": {
      if (!args?.id) throw new Error("Falta el id (usá buscar_tareas).");
      const patch: any = {};
      if (args.estado) {
        const st = ESTADOS[String(args.estado).toLowerCase()];
        if (!st) throw new Error(`Estado inválido: "${args.estado}".`);
        patch.status = st;
        patch.completed_at = st === "done" ? new Date().toISOString() : null;
      }
      if (args.titulo) patch.title = args.titulo;
      if (args.descripcion !== undefined) patch.description = args.descripcion;
      if (args.persona) patch.assignee_id = (await perfil(db, args.persona))!.id;
      if (args.fecha) patch.start_date = args.fecha;
      if (args.hora_inicio) patch.start_time = normHora(args.hora_inicio);
      if (args.hora_fin) patch.end_time = normHora(args.hora_fin);
      if (args.fecha_entrega) patch.due_date = args.fecha_entrega;
      if (args.hora_entrega) patch.due_time = normHora(args.hora_entrega);
      if (args.prioridad) patch.priority = PRIORIDADES[String(args.prioridad).toLowerCase()] ?? "none";
      if (!Object.keys(patch).length) throw new Error("No pasaste ningún campo para cambiar.");
      const { data, error } = await db.from("tasks").update(patch).eq("id", args.id).select("id,title,status").single();
      if (error) throw new Error(error.message);
      return `Tarea actualizada ✓ "${data.title}" · estado: ${estadoLabel[data.status] ?? data.status}`;
    }

    case "crear_evento": {
      if (!args?.titulo || !args?.fecha) throw new Error("Faltan título o fecha.");
      const todoElDia = !!args.todo_el_dia || !args.hora_inicio;
      const hi = normHora(args.hora_inicio) ?? "09:00";
      const hf = normHora(args.hora_fin);
      const fila = {
        title: args.titulo,
        description: args.descripcion ?? null,
        starts_at: new Date(`${args.fecha}T${todoElDia ? "00:00" : hi}:00-03:00`).toISOString(),
        ends_at: hf ? new Date(`${args.fecha}T${hf}:00-03:00`).toISOString() : null,
        all_day: todoElDia,
      };
      const { data, error } = await db.from("events").insert(fila).select("id,title").single();
      if (error) throw new Error(error.message);
      return `Evento creado ✓ "${data.title}" el ${args.fecha}${todoElDia ? " (todo el día)" : ` ${hi}${hf ? `–${hf}` : ""}`} (id:${data.id})`;
    }

    case "listar_docs": {
      const { data, error } = await db.from("docs").select("id,title,icon,updated_at").order("updated_at", { ascending: false }).limit(30);
      if (error) throw new Error(`Base de datos: ${error.message}`);
      if (!data?.length) return "No hay documentos todavía.";
      return data.map((d) => `${d.icon ?? "📄"} ${d.title} · id:${d.id}`).join("\n");
    }

    case "leer_doc": {
      const ref = String(args?.id_o_titulo ?? "").trim();
      if (!ref) throw new Error("Decime el id o el título del doc.");
      const esUuid = /^[0-9a-f-]{36}$/i.test(ref);
      const q = esUuid
        ? db.from("docs").select("id,title,icon,content").eq("id", ref).limit(1)
        : db.from("docs").select("id,title,icon,content").ilike("title", `%${ref}%`).limit(1);
      const { data, error } = await q;
      if (error) throw new Error(`Base de datos: ${error.message}`);
      if (!data?.length) return `No encontré ningún doc que matchee "${ref}".`;
      const d = data[0];
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

    case "enviar_mensaje": {
      if (!args?.canal || !args?.texto || !args?.de) throw new Error("Faltan canal, texto o quién lo manda (de).");
      const autor = await perfil(db, args.de);
      const canalRef = String(args.canal).toLowerCase();
      const { data: canales, error: eCan } = await db.from("channels").select("id,name,kind");
      if (eCan) throw new Error(`Base de datos: ${eCan.message}`);
      const canal = (canales ?? []).find((c) =>
        canalRef === "dm" ? c.kind === "dm" : c.name.toLowerCase().includes(canalRef)
      );
      if (!canal) throw new Error(`No encontré el canal "${args.canal}". Hay: ${(canales ?? []).map((c) => c.name).join(", ")}.`);
      const { error } = await db.from("messages").insert({ channel_id: canal.id, author_id: autor!.id, body: args.texto });
      if (error) throw new Error(error.message);
      // en el DM, avisar al otro (igual que la app)
      if (canal.kind === "dm") {
        const { data: otros } = await db.from("profiles").select("id,name").neq("id", autor!.id);
        for (const o of otros ?? []) {
          await db.from("notifications").insert({
            recipient_id: o.id, actor_id: autor!.id, type: "message",
            title: `💬 ${autor!.name}`, body: args.texto,
            target_type: "channel", target_id: canal.id,
          });
        }
      }
      return `Mensaje enviado ✓ a ${canal.name} como ${autor!.name}.`;
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
        serverInfo: { name: "Atrio HQ", version: "1.0.0" },
        instructions:
          "Conector del HQ de Atrio (estudio de diseño de Lucila y Demian, Buenos Aires). " +
          "Permite ver y manejar la agenda, tareas, eventos de equipo, documentos y el chat interno. " +
          "Fechas en YYYY-MM-DD y horas HH:MM, siempre en hora de Buenos Aires (UTC-3).",
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
