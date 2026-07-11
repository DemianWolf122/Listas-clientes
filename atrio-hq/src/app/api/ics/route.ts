import { NextResponse } from "next/server";

/**
 * Feed iCal (.ics) de la agenda de Atrio para suscribir en Google Calendar,
 * Calendario de Apple o cualquier app de calendario. Solo lectura: Atrio → tus
 * calendarios, se actualiza solo cada ~1 h.
 *
 *   /api/ics                 → todos los eventos + tareas con horario/entrega
 *   /api/ics?assignee=<id>   → eventos + solo las tareas de esa persona
 *
 * Los horarios de tareas se guardan como hora de pared de Buenos Aires (UTC-3,
 * sin horario de verano), así que los convertimos a UTC para el feed.
 */

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const AR_OFFSET = "-03:00";

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
};
type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  start_time: string | null;
  end_time: string | null;
  due_date: string | null;
  due_time: string | null;
  status: string | null;
  assignee_id: string | null;
};

async function rest<T>(path: string): Promise<T[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: ANON!,
      Authorization: `Bearer ${ANON}`,
      "Accept-Profile": "atrio_agenda",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`REST ${path} → ${res.status}`);
  return (await res.json()) as T[];
}

/* ---------- helpers iCal ---------- */
const pad = (n: number) => String(n).padStart(2, "0");

function utcStamp(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T` +
    `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}
/** YYYY-MM-DD (+ HH:MM[:SS]) en hora de Buenos Aires → instante UTC. */
function arToUtc(date: string, time: string): Date {
  const t = time.length === 5 ? `${time}:00` : time;
  return new Date(`${date}T${t}${AR_OFFSET}`);
}
/** Fecha (YYYYMMDD) de un instante, en zona de Buenos Aires. */
function arDate(iso: string): string {
  const s = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
  return s.replace(/-/g, "");
}
const dateOnly = (d: string) => d.replace(/-/g, "");

function esc(s: string): string {
  return (s || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Plegado de líneas a <=73 octetos (RFC 5545), consciente de emojis. */
function fold(line: string): string {
  const enc = new TextEncoder();
  let out = "";
  let cur = "";
  for (const ch of line) {
    if (enc.encode(cur + ch).length > 72) {
      out += (out ? "\r\n " : "") + cur;
      cur = ch;
    } else {
      cur += ch;
    }
  }
  return out + (out ? "\r\n " : "") + cur;
}

export async function GET(req: Request) {
  if (!SUPABASE_URL || !ANON) {
    return new NextResponse("Supabase no configurado", { status: 500 });
  }
  const rawAssignee = new URL(req.url).searchParams.get("assignee");
  // solo UUIDs válidos (evita inyectar filtros arbitrarios en la URL REST)
  const assignee = rawAssignee && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawAssignee)
    ? rawAssignee
    : null;

  let events: EventRow[] = [];
  let tasks: TaskRow[] = [];
  try {
    const taskFilter = assignee ? `&assignee_id=eq.${assignee}` : "";
    [events, tasks] = await Promise.all([
      rest<EventRow>("events?select=id,title,description,starts_at,ends_at,all_day"),
      rest<TaskRow>(
        `tasks?select=id,title,description,start_date,start_time,end_time,due_date,due_time,status,assignee_id&parent_task_id=is.null${taskFilter}`
      ),
    ]);
  } catch {
    return new NextResponse("No se pudo leer la agenda", { status: 502 });
  }

  const now = utcStamp(new Date());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Atrio HQ//Agenda//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${assignee ? "Atrio · mi agenda" : "Atrio · agenda"}`,
    "X-WR-TIMEZONE:America/Argentina/Buenos_Aires",
    "X-PUBLISHED-TTL:PT1H",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
  ];

  const push = (
    uid: string,
    summary: string,
    opts: { start: string; end?: string; allDay?: boolean; desc?: string | null }
  ) => {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}@atrio-hq`);
    lines.push(`DTSTAMP:${now}`);
    if (opts.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${opts.start}`);
      if (opts.end) lines.push(`DTEND;VALUE=DATE:${opts.end}`);
    } else {
      lines.push(`DTSTART:${opts.start}`);
      if (opts.end) lines.push(`DTEND:${opts.end}`);
    }
    lines.push(`SUMMARY:${esc(summary)}`);
    if (opts.desc) lines.push(`DESCRIPTION:${esc(opts.desc)}`);
    lines.push("END:VEVENT");
  };

  // Eventos
  for (const e of events) {
    if (e.all_day) {
      push(`evt-${e.id}`, e.title, { start: arDate(e.starts_at), allDay: true, desc: e.description });
    } else {
      push(`evt-${e.id}`, e.title, {
        start: utcStamp(new Date(e.starts_at)),
        end: e.ends_at ? utcStamp(new Date(e.ends_at)) : undefined,
        desc: e.description,
      });
    }
  }

  // Tareas
  for (const t of tasks) {
    const done = t.status === "done";
    const scheduled = Boolean(t.start_date && t.start_time);
    if (scheduled) {
      const start = arToUtc(t.start_date!, t.start_time!);
      const end = t.end_time ? arToUtc(t.start_date!, t.end_time) : new Date(start.getTime() + 30 * 60000);
      push(`task-${t.id}`, `${done ? "✓ " : ""}${t.title}`, {
        start: utcStamp(start),
        end: utcStamp(end),
        desc: t.description,
      });
    }
    // Entrega (si no coincide con el bloque agendado del mismo día)
    if (t.due_date && !(scheduled && t.start_date === t.due_date)) {
      if (t.due_time) {
        const start = arToUtc(t.due_date, t.due_time);
        push(`due-${t.id}`, `⏰ Entrega: ${t.title}`, {
          start: utcStamp(start),
          end: utcStamp(new Date(start.getTime() + 30 * 60000)),
          desc: t.description,
        });
      } else {
        push(`due-${t.id}`, `⏰ Entrega: ${t.title}`, {
          start: dateOnly(t.due_date),
          allDay: true,
          desc: t.description,
        });
      }
    }
  }

  lines.push("END:VCALENDAR");
  const body = lines.map(fold).join("\r\n") + "\r\n";

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="atrio.ics"',
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
