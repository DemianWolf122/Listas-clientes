"use client";

import { useEffect, useMemo, useState } from "react";
import { format, parseISO, startOfWeek, addDays as fnsAddDays, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, List, LayoutGrid, Plus, CalendarClock } from "lucide-react";
import { useAllTasks, useUpdateTask, useToggleTask, type TaskWithTags } from "@/hooks/tasks";
import { useEvents } from "@/hooks/events";
import { useProfileMap } from "@/hooks/profiles";
import { useUI, usePrefs } from "@/stores/ui";
import { Segmented } from "@/components/ui/Segmented";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusCheckbox, PriorityDot, ScheduleControl, DueChip } from "@/components/tasks/controls";
import { EventDialog } from "@/components/calendar/EventDialog";
import { fireConfetti } from "@/lib/confetti";
import { playChime } from "@/lib/sound";
import { hm, timeOfDay, cn } from "@/lib/utils";
import type { CalEvent, Profile } from "@/lib/types/database";

const ymd = (d: Date) => format(d, "yyyy-MM-dd");
/** sort >= este valor = "sin horario" (va al final del día / sección aparte). */
const SIN_HORARIO = 2000;
const minutesOf = (t?: string | null) => {
  if (!t) return 0;
  const [h, m] = hm(t).split(":").map(Number);
  return h * 60 + m;
};
function durationLabel(start?: string | null, end?: string | null) {
  if (!start || !end) return "";
  const mins = minutesOf(end) - minutesOf(start);
  if (mins <= 0) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return [h ? `${h} h` : "", m ? `${m} min` : ""].filter(Boolean).join(" ");
}
function tint(hex: string, alpha: number) {
  const h = (hex || "#2383E2").replace("#", "");
  if (h.length < 6) return `rgba(35,131,226,${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

type Card = {
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

export function AgendaView() {
  const { data: tasks } = useAllTasks();
  const { data: events } = useEvents();
  const profileMap = useProfileMap();
  const openPeek = useUI((s) => s.openPeek);

  const [view, setView] = useState<"week" | "day">("week");
  const [date, setDate] = useState<Date>(() => new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CalEvent | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>();

  // En teléfonos, la vista de día es más legible que la grilla semanal.
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      setView("day");
    }
  }, []);

  function newEvent(forDate?: string) {
    setEditing(null);
    setDefaultDate(forDate ?? ymd(date));
    setDialogOpen(true);
  }
  function openEvent(e: CalEvent) {
    setEditing(e);
    setDefaultDate(undefined);
    setDialogOpen(true);
  }
  function goToDay(day: Date) {
    setDate(day);
    setView("day");
  }

  // tarjetas por día (fecha → cards ordenadas)
  const cardsByDay = useMemo(() => {
    const map: Record<string, Card[]> = {};
    const push = (day: string, c: Card) => {
      (map[day] ||= []).push(c);
    };
    (tasks ?? []).forEach((t) => {
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
    (events ?? []).forEach((e) => {
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
  }, [tasks, events]);

  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => fnsAddDays(weekStart, i));
  const rangeLabel = `${format(weekStart, "d")}–${format(fnsAddDays(weekStart, 6), "d 'de' MMMM", { locale: es })}`;

  // vista Día: con horario arriba (ordenado), sin horario en su propia sección
  const dayCards = cardsByDay[ymd(date)] ?? [];
  const timed = dayCards.filter((c) => c.sort < SIN_HORARIO);
  const sinHorario = dayCards.filter((c) => c.sort >= SIN_HORARIO && c.task && c.task.status !== "done");

  return (
    <div className="flex h-full flex-col bg-surface/40">
      {/* header */}
      <div className="flex flex-wrap items-center gap-2 border-b border-hairline bg-canvas px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-1">
          <button
            className="icon-btn"
            onClick={() => setDate(fnsAddDays(date, view === "week" ? -7 : -1))}
            aria-label="Anterior"
          >
            <ChevronLeft size={17} />
          </button>
          <button
            className="icon-btn"
            onClick={() => setDate(fnsAddDays(date, view === "week" ? 7 : 1))}
            aria-label="Siguiente"
          >
            <ChevronRight size={17} />
          </button>
          <button
            onClick={() => setDate(new Date())}
            className="ml-1 rounded-md px-2 py-1 text-[13px] font-medium text-accent transition-colors hover:bg-accent-soft"
          >
            Hoy
          </button>
        </div>
        <div className="min-w-0 text-[15px] font-semibold text-ink first-letter:uppercase">
          {view === "week" ? rangeLabel : format(date, "EEEE d 'de' MMMM", { locale: es })}
        </div>
        <div className="flex-1" />
        <button
          onClick={() => newEvent()}
          className="hidden items-center gap-1.5 rounded-lg bg-ink px-2.5 py-1.5 text-[13px] font-medium text-canvas transition hover:opacity-90 sm:inline-flex"
        >
          <Plus size={14} /> Nuevo evento
        </button>
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: "week", label: "Semana", icon: <LayoutGrid size={14} /> },
            { value: "day", label: "Día", icon: <List size={14} /> },
          ]}
        />
      </div>

      {/* tira de días (vista Día): saltar rápido entre días de la semana */}
      {view === "day" && (
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-hairline bg-canvas px-4 py-2 no-scrollbar sm:px-6">
          {weekDays.map((day) => {
            const selected = isSameDay(day, date);
            const today = isSameDay(day, new Date());
            return (
              <button
                key={ymd(day)}
                onClick={() => setDate(day)}
                className={cn(
                  "flex min-w-[54px] shrink-0 flex-col items-center rounded-xl border px-2.5 py-1 transition-colors",
                  selected
                    ? "border-transparent bg-ink text-canvas"
                    : "border-hairline bg-canvas hover:bg-surface-hover",
                  !selected && today && "border-accent/60"
                )}
              >
                <span className={cn("text-2xs font-semibold uppercase tracking-wide", selected ? "text-canvas/70" : "text-ink-tertiary")}>
                  {format(day, "EEE", { locale: es })}
                </span>
                <span className={cn("text-[14px] font-semibold tnum", selected ? "text-canvas" : "text-ink")}>
                  {format(day, "d")}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {view === "week" ? (
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
                    onClick={() => goToDay(day)}
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
                      <AgendaCard key={c.key} card={c} profileMap={profileMap} onOpenTask={(id) => openPeek({ kind: "task", id })} onOpenEvent={openEvent} />
                    ))}
                    <button
                      onClick={() => newEvent(dayStr)}
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
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto bg-canvas">
          <div className="mx-auto max-w-2xl px-4 py-5 sm:px-6">
            {timed.length === 0 && sinHorario.length === 0 ? (
              <EmptyState
                emoji="🗓️"
                title={isSameDay(date, new Date()) ? "Tu día está libre" : "Nada agendado este día"}
                hint="Ponele horario a una tarea (campo Agenda en su detalle) o creá un evento."
                className="mt-10"
                action={
                  <button onClick={() => newEvent()} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-[13px] font-medium text-accent-fg transition hover:opacity-90">
                    <Plus size={15} /> Nuevo evento
                  </button>
                }
              />
            ) : (
              <>
                <div className="space-y-1.5">
                  {timed.map((c) =>
                    c.kind === "task" && c.task ? (
                      <TaskRow key={c.key} task={c.task} color={c.color} />
                    ) : c.event ? (
                      <EventRow key={c.key} event={c.event} color={c.color} onOpen={() => openEvent(c.event!)} />
                    ) : null
                  )}
                </div>
                {sinHorario.length > 0 && (
                  <div className="mt-6">
                    <div className="mb-2 flex items-center gap-1.5 px-1 text-2xs font-semibold uppercase tracking-wide text-ink-tertiary">
                      <CalendarClock size={13} /> Para este día · sin horario
                    </div>
                    <div className="space-y-1">
                      {sinHorario.map((c) => (
                        <UnscheduledRow
                          key={c.key}
                          task={c.task!}
                          dateStr={ymd(date)}
                          assignee={c.assigneeId ? profileMap[c.assigneeId] : undefined}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <EventDialog open={dialogOpen} onOpenChange={setDialogOpen} event={editing} defaultDate={defaultDate} />
    </div>
  );
}

/* ---------------- Tarjeta de agenda (semana) ---------------- */
function AgendaCard({
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

/* ---------------- filas de la vista Día ---------------- */
function TaskRow({ task, color }: { task: TaskWithTags; color: string }) {
  const openPeek = useUI((s) => s.openPeek);
  const toggle = useToggleTask();
  const { sounds, celebrate } = usePrefs();
  const done = task.status === "done";
  const dur = durationLabel(task.start_time, task.end_time);
  const timeStart = task.start_time ? hm(task.start_time) : "";
  const timeEnd = task.start_time && task.end_time ? hm(task.end_time) : null;
  const isEntrega = !task.start_time && !!task.due_time;
  return (
    <button
      onClick={() => openPeek({ kind: "task", id: task.id })}
      className="group flex w-full items-stretch gap-1 overflow-hidden rounded-xl border border-hairline bg-canvas text-left shadow-card transition-shadow hover:shadow-subtle"
    >
      <div className="w-[52px] shrink-0 py-2.5 pl-3 text-right tnum">
        <div className="text-[13px] font-semibold text-ink">{timeStart || (task.due_time ? hm(task.due_time) : "")}</div>
        {timeEnd && <div className="text-2xs text-ink-tertiary">{timeEnd}</div>}
        {isEntrega && <div className="text-2xs text-ink-tertiary">entrega</div>}
      </div>
      <div className="my-2.5 w-1 shrink-0 rounded-full" style={{ background: color }} />
      <div className="min-w-0 flex-1 py-2.5 pl-1.5 pr-3">
        <div className="flex items-center gap-2">
          <StatusCheckbox
            checked={done}
            size={16}
            onToggle={() => {
              toggle.mutate({ task, done: !done });
              if (!done) {
                if (celebrate) fireConfetti();
                if (sounds) playChime();
              }
            }}
          />
          <span className={cn("truncate text-[14px] font-medium text-ink", done && "text-ink-tertiary line-through")}>{task.title}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 pl-[26px] text-2xs text-ink-tertiary">
          {dur && <span className="tnum">{dur}</span>}
          {task.project && <span className="truncate">{task.project.emoji} {task.project.name}</span>}
        </div>
      </div>
    </button>
  );
}

function EventRow({ event, color, onOpen }: { event: CalEvent; color: string; onOpen: () => void }) {
  const start = event.all_day ? null : timeOfDay(event.starts_at);
  const end = !event.all_day && event.ends_at ? timeOfDay(event.ends_at) : null;
  return (
    <button
      onClick={onOpen}
      className="group flex w-full items-stretch gap-1 overflow-hidden rounded-xl border border-hairline bg-canvas text-left shadow-card transition-shadow hover:shadow-subtle"
    >
      <div className="w-[52px] shrink-0 py-2.5 pl-3 text-right tnum">
        <div className="text-[13px] font-semibold text-ink">{start ?? "—"}</div>
        {end && <div className="text-2xs text-ink-tertiary">{end}</div>}
      </div>
      <div className="my-2.5 w-1 shrink-0 rounded-full" style={{ background: color }} />
      <div className="min-w-0 flex-1 py-2.5 pl-1.5 pr-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
          <span className="truncate text-[14px] font-medium text-ink">{event.title}</span>
          {event.all_day && (
            <span className="shrink-0 rounded-full bg-surface px-1.5 py-0.5 text-2xs text-ink-secondary">todo el día</span>
          )}
        </div>
        {event.description && <div className="mt-0.5 truncate pl-[18px] text-2xs text-ink-tertiary">{event.description}</div>}
      </div>
    </button>
  );
}

function UnscheduledRow({ task, dateStr, assignee }: { task: TaskWithTags; dateStr: string; assignee?: Profile }) {
  const openPeek = useUI((s) => s.openPeek);
  const toggle = useToggleTask();
  const update = useUpdateTask();
  const { sounds, celebrate } = usePrefs();
  const done = task.status === "done";
  return (
    <div className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-hover">
      <StatusCheckbox
        checked={done}
        size={17}
        onToggle={() => {
          toggle.mutate({ task, done: !done });
          if (!done) {
            if (celebrate) fireConfetti();
            if (sounds) playChime();
          }
        }}
      />
      <button onClick={() => openPeek({ kind: "task", id: task.id })} className="min-w-0 flex-1 truncate text-left text-[14px] text-ink">
        <PriorityDot value={task.priority} />
        <span className="ml-1.5">{task.title}</span>
      </button>
      {assignee && <Avatar profile={assignee} size={18} />}
      <DueChip value={task.due_date} status={task.status} time={task.due_time} />
      <ScheduleControl
        date={task.start_date ?? dateStr}
        start={task.start_time}
        end={task.end_time}
        onChange={(v) => update.mutate({ id: task.id, start_date: v.date, start_time: v.start, end_time: v.end })}
      />
    </div>
  );
}
