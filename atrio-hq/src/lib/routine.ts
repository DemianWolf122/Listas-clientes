/**
 * Rutina — los 5 sub-calendarios de Atrio y la matemática de la grilla.
 *
 * La idea: el día no es una lista de tareas sueltas sino bloques que caen en un
 * área. Cada área tiene su color y su franja natural del día (el trabajo
 * profundo va de 10 a 14, que es cuando el cerebro rinde; las reuniones a la
 * tarde, que drenan pero piden menos foco). El calendario "combinado" es
 * simplemente no filtrar ninguna área.
 */

export type RoutineArea = "deep" | "meetings" | "admin" | "health" | "social";

export const ROUTINE_AREAS: Record<
  RoutineArea,
  {
    label: string;
    /** sigla que se ve en la tarjeta: "DW | ESC — Portada" */
    short: string;
    emoji: string;
    color: string;
    hint: string;
    /** franja sugerida del día en minutos [desde, hasta) */
    window?: [number, number];
  }
> = {
  deep: {
    label: "Trabajo profundo",
    short: "DW",
    emoji: "🧠",
    color: "#3B7DD8",
    hint: "Atención plena, sin interrupciones. 10:00–14:00, el pico del cerebro.",
    window: [600, 840],
  },
  meetings: {
    label: "Reuniones",
    short: "MTG",
    emoji: "🗣️",
    color: "#8E7CC3",
    hint: "Comunicación: piden menos foco pero drenan. Van a la tarde.",
    window: [840, 1200],
  },
  admin: {
    label: "Administrativo",
    short: "ADM",
    emoji: "🗂️",
    color: "#EA9A46",
    hint: "Lo repetitivo: mails, mensajes, seguimientos, papeleo.",
    window: [840, 1200],
  },
  health: {
    label: "Salud",
    short: "HLTH",
    emoji: "🌿",
    color: "#3FC6A0",
    hint: "Gimnasio, terapia, comer bien, descansar sin pantallas.",
  },
  social: {
    label: "Social",
    short: "SOC",
    emoji: "💛",
    color: "#E58BA8",
    hint: "Gente: pareja, familia, amigos, planes.",
  },
};

export const AREA_ORDER: RoutineArea[] = ["deep", "meetings", "admin", "health", "social"];

export function isArea(v: unknown): v is RoutineArea {
  return typeof v === "string" && v in ROUTINE_AREAS;
}

export function areaOf(v: string | null | undefined): RoutineArea {
  return isArea(v) ? v : "deep";
}

/** Franja de foco que se dibuja de fondo en la grilla. */
export const FOCUS_WINDOW = ROUTINE_AREAS.deep.window!;

export const REPEAT_RULES = {
  none: "No se repite",
  daily: "Todos los días",
  weekdays: "Lunes a viernes",
  weekly: "Cada semana, este día",
} as const;
export type RepeatRule = keyof typeof REPEAT_RULES;

/* ------------------------------ horas ------------------------------ */

/** "14:30" o "14:30:00" → 870. */
export function toMin(t?: string | null): number {
  if (!t) return 0;
  const [h, m] = t.split(":");
  return Number(h) * 60 + Number(m ?? 0);
}

/** 870 → "14:30". Corta a las 24 h. */
export function toHM(min: number): string {
  const clamped = Math.max(0, Math.min(24 * 60, Math.round(min)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function durationLabel(startMin: number, endMin: number): string {
  const mins = Math.max(0, endMin - startMin);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return [h ? `${h} h` : "", m ? `${m} min` : ""].filter(Boolean).join(" ") || "0 min";
}

/** Área sugerida según la hora en la que tocaste la grilla. */
export function suggestArea(startMin: number): RoutineArea {
  if (startMin < FOCUS_WINDOW[0]) return "health";
  if (startMin < FOCUS_WINDOW[1]) return "deep";
  if (startMin < 18 * 60) return "meetings";
  return "social";
}

/** Un bloque queda "fuera de franja" si su área tiene ventana y no la respeta. */
export function offWindow(area: RoutineArea, startMin: number): boolean {
  const w = ROUTINE_AREAS[area].window;
  if (!w) return false;
  return startMin < w[0] || startMin >= w[1];
}

/* ------------------------------ recurrencia ------------------------------ */

export type RoutineBlockLike = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  repeat_rule: string;
  repeat_until: string | null;
};

/** Fecha "yyyy-MM-dd" → Date local al mediodía (evita corrimientos por zona). */
function parseDay(d: string): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, day ?? 1, 12, 0, 0, 0);
}

/** ¿Este bloque cae en este día, siguiendo su regla de repetición? */
export function occursOn(block: RoutineBlockLike, dateStr: string): boolean {
  if (block.date === dateStr) return true;
  if (block.repeat_rule === "none") return false;
  if (dateStr < block.date) return false;
  if (block.repeat_until && dateStr > block.repeat_until) return false;
  const dow = parseDay(dateStr).getDay(); // 0 domingo … 6 sábado
  switch (block.repeat_rule) {
    case "daily":
      return true;
    case "weekdays":
      return dow >= 1 && dow <= 5;
    case "weekly":
      return dow === parseDay(block.date).getDay();
    default:
      return false;
  }
}

/* ------------------------------ layout ------------------------------ */

export type Span = { startMin: number; endMin: number };
export type Positioned<T> = { item: T; col: number; cols: number };

/**
 * Reparte en columnas los bloques que se pisan, como hace Google Calendar:
 * los que no se solapan ocupan todo el ancho, y un grupo solapado se divide en
 * tantas columnas como haga falta.
 */
export function layoutColumns<T extends Span>(items: T[]): Positioned<T>[] {
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);
  const out: Positioned<T>[] = [];
  let cluster: Positioned<T>[] = [];
  let columnEnds: number[] = [];
  let clusterEnd = -1;

  const flush = () => {
    const cols = Math.max(1, columnEnds.length);
    cluster.forEach((p) => (p.cols = cols));
    out.push(...cluster);
    cluster = [];
    columnEnds = [];
    clusterEnd = -1;
  };

  for (const item of sorted) {
    // arranca un grupo nuevo cuando ya no se pisa con nada del anterior
    if (cluster.length && item.startMin >= clusterEnd) flush();
    let col = columnEnds.findIndex((end) => end <= item.startMin);
    if (col === -1) {
      columnEnds.push(item.endMin);
      col = columnEnds.length - 1;
    } else {
      columnEnds[col] = item.endMin;
    }
    cluster.push({ item, col, cols: 1 });
    clusterEnd = Math.max(clusterEnd, item.endMin);
  }
  if (cluster.length) flush();
  return out;
}

/** Rango horario visible: se ajusta solo a lo que hay cargado ese día. */
export function fitRange(spans: Span[], floorH = 7, ceilH = 23): [number, number] {
  if (!spans.length) return [floorH, ceilH];
  const first = Math.min(...spans.map((s) => s.startMin));
  const last = Math.max(...spans.map((s) => s.endMin));
  const start = Math.min(floorH, Math.floor(first / 60));
  const end = Math.max(ceilH, Math.ceil(last / 60));
  return [Math.max(0, start), Math.min(24, end)];
}

/** Color con alfa, para tintes de fondo. */
export function tint(hex: string, alpha: number): string {
  const h = (hex || "#3B7DD8").replace("#", "");
  if (h.length < 6) return `rgba(59,125,216,${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
