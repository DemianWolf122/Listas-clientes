export const SCHEMA = "atrio_agenda" as const;

export const TASK_STATUS = {
  todo: { label: "Por hacer", color: "#9B9B98" },
  in_progress: { label: "En progreso", color: "#3B7DD8" },
  done: { label: "Listo", color: "#4FA373" },
} as const;
export type TaskStatus = keyof typeof TASK_STATUS;
export const STATUS_ORDER: TaskStatus[] = ["todo", "in_progress", "done"];

export const PRIORITY = {
  none: { label: "Sin prioridad", color: "#B9B9B6", rank: 0 },
  low: { label: "Baja", color: "#8B8B88", rank: 1 },
  medium: { label: "Media", color: "#3B7DD8", rank: 2 },
  high: { label: "Alta", color: "#EA9A46", rank: 3 },
  urgent: { label: "Urgente", color: "#E5624F", rank: 4 },
} as const;
export type Priority = keyof typeof PRIORITY;
export const PRIORITY_ORDER: Priority[] = ["urgent", "high", "medium", "low", "none"];

/** paleta pastel para tags / proyectos / eventos */
export const PASTELS = [
  "#F3D9E0",
  "#F6D6CE",
  "#EFE7D2",
  "#DEEEDD",
  "#D7E5F5",
  "#E4DCF3",
  "#F5E6C8",
  "#CFE9E6",
  "#F0DDD0",
  "#E9E9E7",
] as const;

/** emojis frecuentes para reacciones rápidas */
export const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉", "🙌", "🔥", "👀", "✅"];

/** set curado para el picker de íconos (proyectos, canales, docs) */
export const ICON_EMOJIS = [
  "📁", "📂", "🗂️", "📌", "📎", "🗒️", "📄", "📝", "📋", "🧾",
  "💬", "💛", "💙", "💚", "❤️", "🧡", "💜", "🩵", "✨", "⭐",
  "🚀", "⚡", "🔥", "🎯", "🎨", "🖌️", "🖍️", "✏️", "🧠", "💡",
  "🌿", "🌱", "🌸", "🌼", "🌻", "🌵", "🍃", "🪴", "🌊", "🏔️",
  "🏛️", "🏠", "🛠️", "⚙️", "🧩", "🔧", "📦", "🛍️", "🛒", "💼",
  "☕", "🍵", "🥐", "🎵", "📷", "🎬", "📚", "🔮", "🗺️", "🧭",
];

export const STATUS_EMOJIS = ["🎨", "☕", "🔴", "🟢", "🧠", "🎧", "🍵", "🏃", "😴", "🌙", "💻", "📞"];

/** estados de presencia (Discord-like) */
export const PRESENCE = {
  online: { label: "Activo/a", color: "#4FA373" },
  idle: { label: "Ausente", color: "#EA9A46" },
  dnd: { label: "No molestar", color: "#E5624F" },
  offline: { label: "Desconectado/a", color: "#B9B9B6" },
} as const;
export type PresenceState = keyof typeof PRESENCE;

export const NOTIF_TYPE = {
  mention: { label: "Mención", emoji: "💬" },
  assigned: { label: "Te asignaron", emoji: "📌" },
  comment: { label: "Comentario", emoji: "🗨️" },
  message: { label: "Mensaje", emoji: "✉️" },
  due_soon: { label: "Vence pronto", emoji: "⏰" },
} as const;
