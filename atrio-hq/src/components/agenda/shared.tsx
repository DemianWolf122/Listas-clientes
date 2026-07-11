"use client";

import { useMemo } from "react";
import { format, parseISO, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { Plus } from "lucide-react";
import { useAllTasks, type TaskWithTags } from "@/hooks/tasks";
import { useEvents } from "@/hooks/events";
import { Avatar } from "@/components/ui/Avatar";
import { PriorityDot } from "@/components/tasks/controls";
import { hm, timeOfDay, cn } from "@/lib/utils";
import type { CalEvent, Profile } from "@/lib/types/database";

export const ymd = (d: Date) => format(d, "yyyy-MM-dd");
/** sort >= este valor = "sin horario" (va al final del día / sección aparte). */
export const SIN_HORARIO = 2000;

export const minutesOf = (t?: string | null) => {
  if (!t) return 0;
  const [h, m] = hm(t).split(":").map(Number);
  return h * 60 + m;
};

export function durationLabel(start?: string | null, end?: string | null) {
  if (!start || !end) return "";
  const mins = minutesOf(end) - minutesOf(start);
  if (mins <= 0) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return [h ? `${h} h` : "", m ? `${m} min` : ""].filter(Boolean).join(" ");
}

export function tint(hex: string, alpha: number) {
  const h = (hex || "#2383E2").replace("#", "");
  if (h.length < 6) return `rgba(35,131,226,${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export type Card = {
  key: string;
  kind: "task" | "event";
  color: string;
  emoji: string;
  title: string;
  subtitle?: string;
  timeLabel: string;
  sort: number;
  task?: TaskWithTags;
  event?: CalEvent;
  assigneeId?: string | null;
  done?: boolean;
};

/**
 * Tarjetas por día (fecha → cards ordenadas por horario) a partir de tareas y
 * eventos. Con `projectId`, filtra todo a ese proyecto (calendario de proyecto).
 */
export function useAgendaCards(projectId?: string): Record<string, Card[]> {
  const { data: tasks } = useAllTasks();
  const { data: events } = useEvents();

  return useMemo(() => {
    const map: Record<string, Card[]> = {};
    const push = (day: string, c: Card) => {
      (map[day] ||= []).push(c);
    };
    (tasks ?? [])
      .filter((t) => !projectId || t.project_id === projectId)
      .forEach((t) => {
        const scheduled = Boolean(t.start_date && t.start_time);
        if (scheduled) {
          push(t.start_date!, {
            key: `ts-${t.id}`,
            kind: "task",
            color: t.project?.color ?? "#2383E2",
            emoji: t.project?.emoji ?? "🗒️",
            title: t.title,
            subtitle: t.project?.name,
            timeLabel: `${hm(t.start_time)}${t.end_time ? `–${hm(t.end_time)}` : ""}`,
            sort: minutesOf(t.start_time),
            task: t,
            assigneeId: t.assignee_id,
            done: t.status === "done",
          });
        }
        // La entrega también aparece en su día (salvo que coincida con el bloque agendado).
        if (t.due_date && !(scheduled && t.start_date === t.due_date)) {
          push(t.due_date, {
            key: `td-${t.id}`,
            kind: "task",
            color: t.project?.color ?? "#9B9B98",
            emoji: t.project?.emoji ?? "🗒️",
            title: t.title,
            subtitle: t.project?.name ?? "Sin proyecto",
            timeLabel: t.due_time ? `entrega ${hm(t.due_time)}` : "vence",
            sort: t.due_time ? minutesOf(t.due_time) : SIN_HORARIO,
            task: t,
            assigneeId: t.assignee_id,
            done: t.status === "done",
          });
        }
      });
    (events ?? [])
      .filter((e) => !projectId || e.project_id === projectId)
      .forEach((e) => {
        const day = format(parseISO(e.starts_at), "yyyy-MM-dd");
        push(day, {
          key: `e-${e.id}`,
          kind: "event",
          color: e.color ?? "#8E7CC3",
          emoji: "📅",
          title: e.title,
          subtitle: e.description ?? "Evento",
          timeLabel: e.all_day ? "todo el día" : `${timeOfDay(e.starts_at)}${e.ends_at ? `–${timeOfDay(e.ends_at)}` : ""}`,
          sort: e.all_day ? -1 : minutesOf(timeOfDay(e.starts_at)),
          event: e,
        });
      });
    Object.values(map).forEach((arr) => arr.sort((a, b) => a.sort - b.sort));
    return map;
  }, [tasks, events, projectId]);
}

/* ---------------- Tarjeta rica (columnas de semana) ---------------- */
export function AgendaCard({
  card,
  profileMap,
  onOpenTask,
  onOpenEvent,
}: {
  card: Card;
  profileMap: Record<string, Profile>;
  onOpenTask: (id: string) => void;
  onOpenEvent: (e: CalEvent) => void;
}) {
  const assignee = card.assigneeId ? profileMap[card.assigneeId] : undefined;
  return (
    <button
      onClick={() => (card.task ? onOpenTask(card.task.id) : card.event ? onOpenEvent(card.event) : undefined)}
      className={cn(
        "w-full rounded-xl border p-2.5 text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-subtle",
        card.done && "opacity-60"
      )}
      style={{
        background: tint(card.color, 0.13),
        borderColor: tint(card.color, 0.28),
        borderLeft: `3px solid ${card.color}`,
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-lg text-[13px] leading-none"
          style={{ background: tint(card.color, 0.3) }}
        >
          {card.emoji}
        </span>
        {card.kind === "task" && <PriorityDot value={card.task?.priority ?? "none"} />}
      </div>
      <div className={cn("mt-1.5 line-clamp-2 text-[13px] font-semibold leading-snug text-ink", card.done && "line-through")}>
        {card.title}
      </div>
      {card.subtitle && <div className="truncate text-2xs text-ink-secondary">{card.subtitle}</div>}
      <div className="mt-1.5 flex items-center justify-between gap-1">
        <span className="truncate text-2xs font-medium tnum text-ink-tertiary">{card.timeLabel}</span>
        {assignee && <Avatar profile={assignee} size={18} />}
      </div>
    </button>
  );
}

/* ---------------- Tablero semanal: 7 columnas de día con tarjetas ---------------- */
export function WeekBoard({
  weekDays,
  cardsByDay,
  profileMap,
  onDayHeaderClick,
  onNewEvent,
  onOpenTask,
  onOpenEvent,
}: {
  weekDays: Date[];
  cardsByDay: Record<string, Card[]>;
  profileMap: Record<string, Profile>;
  onDayHeaderClick: (day: Date) => void;
  onNewEvent: (dayStr: string) => void;
  onOpenTask: (id: string) => void;
  onOpenEvent: (e: CalEvent) => void;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="flex min-w-[860px] gap-2.5 p-3 sm:px-4">
        {weekDays.map((day) => {
          const dayStr = ymd(day);
          const today = isSameDay(day, new Date());
          const weekend = day.getDay() === 0 || day.getDay() === 6;
          const cards = cardsByDay[dayStr] ?? [];
          return (
            <div key={dayStr} className="flex min-w-[118px] flex-1 flex-col">
              {/* header del día → toca para abrir ese día en vista Día */}
              <button
                onClick={() => onDayHeaderClick(day)}
                title="Ver este día"
                className={cn(
                  "mb-1 w-full rounded-xl border px-3 py-2 text-center transition-colors",
                  today
                    ? "border-transparent bg-ink text-canvas"
                    : "border-hairline bg-canvas hover:bg-surface-hover",
                  weekend && !today && "opacity-70"
                )}
              >
                <div className={cn("text-2xs font-semibold uppercase tracking-wide", today ? "text-canvas/70" : "text-ink-tertiary")}>
                  {format(day, "EEE", { locale: es })}
                </div>
                <div className={cn("text-[15px] font-semibold tnum", today ? "text-canvas" : "text-ink")}>
                  {format(day, "d/MM")}
                </div>
              </button>
              {/* cards del día */}
              <div className={cn("group min-h-[60px] flex-1 space-y-2 rounded-xl p-1", today && "bg-accent-soft/40")}>
                {cards.map((c) => (
                  <AgendaCard key={c.key} card={c} profileMap={profileMap} onOpenTask={onOpenTask} onOpenEvent={onOpenEvent} />
                ))}
                <button
                  onClick={() => onNewEvent(dayStr)}
                  className={cn(
                    "flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-hairline py-1.5 text-2xs text-ink-tertiary transition-colors hover:border-accent/40 hover:text-accent",
                    cards.length > 0 && "touch-reveal"
                  )}
                >
                  <Plus size={13} /> Evento
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
