"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, List, CalendarRange, CalendarClock, Plus } from "lucide-react";
import { useAllTasks, useMyTasks, useUpdateTask, useToggleTask, type TaskWithTags } from "@/hooks/tasks";
import { useEvents } from "@/hooks/events";
import { useIdentity } from "@/stores/identity";
import { useUI, usePrefs } from "@/stores/ui";
import { Segmented } from "@/components/ui/Segmented";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusCheckbox, PriorityDot, ScheduleControl, DueChip } from "@/components/tasks/controls";
import { EventDialog } from "@/components/calendar/EventDialog";
import { fireConfetti } from "@/lib/confetti";
import { playChime } from "@/lib/sound";
import { hm, timeOfDay, readableText, cn } from "@/lib/utils";
import type { CalEvent } from "@/lib/types/database";

const ymd = (d: Date) => format(d, "yyyy-MM-dd");
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
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

type Item =
  | { kind: "task"; start: string; end: string | null; task: TaskWithTags; color: string }
  | { kind: "event"; start: string; end: string | null; allDay: boolean; event: CalEvent; color: string };

export function AgendaView() {
  const me = useIdentity((s) => s.profileId);
  const { data: tasks } = useAllTasks();
  const { data: myTasks } = useMyTasks(me);
  const { data: events } = useEvents();
  const openPeek = useUI((s) => s.openPeek);

  const [view, setView] = useState<"list" | "grid">("list");
  const [date, setDate] = useState<Date>(() => new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CalEvent | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>();
  const dateStr = ymd(date);
  const isToday = ymd(new Date()) === dateStr;

  const timeline = useMemo<Item[]>(() => {
    const taskItems: Item[] = (tasks ?? [])
      .filter((t) => t.start_date === dateStr && t.start_time)
      .map((t) => ({
        kind: "task",
        start: hm(t.start_time),
        end: t.end_time ? hm(t.end_time) : null,
        task: t,
        color: t.project?.color ?? "#2383E2",
      }));
    const evItems: Item[] = (events ?? [])
      .filter((e) => format(parseISO(e.starts_at), "yyyy-MM-dd") === dateStr)
      .map((e) => ({
        kind: "event",
        start: e.all_day ? "" : timeOfDay(e.starts_at),
        end: e.ends_at ? timeOfDay(e.ends_at) : null,
        allDay: e.all_day,
        event: e,
        color: e.color ?? "#8E7CC3",
      }));
    return [...taskItems, ...evItems].sort((a, b) => {
      const am = a.kind === "event" && (a as any).allDay ? -1 : minutesOf(a.start);
      const bm = b.kind === "event" && (b as any).allDay ? -1 : minutesOf(b.start);
      return am - bm;
    });
  }, [tasks, events, dateStr]);

  const paraHoy = useMemo(
    () =>
      (myTasks ?? []).filter(
        (t) => t.status !== "done" && t.due_date === dateStr && !(t.start_date === dateStr && t.start_time)
      ),
    [myTasks, dateStr]
  );

  const plannedMin = timeline.reduce(
    (acc, i) => acc + (i.kind === "task" && i.end ? minutesOf(i.end) - minutesOf(i.start) : 0),
    0
  );
  const blocks = timeline.filter((i) => i.kind === "task").length;
  const evCount = timeline.filter((i) => i.kind === "event").length;

  function summary() {
    const parts: string[] = [];
    if (blocks) parts.push(`${blocks} ${blocks === 1 ? "bloque" : "bloques"}`);
    if (plannedMin) {
      const h = Math.floor(plannedMin / 60);
      const m = plannedMin % 60;
      parts.push(`${[h ? `${h} h` : "", m ? `${m} min` : ""].filter(Boolean).join(" ")} planificadas`);
    }
    if (evCount) parts.push(`${evCount} ${evCount === 1 ? "evento" : "eventos"}`);
    return parts.length ? parts.join(" · ") : "Día libre";
  }

  function newEvent() {
    setEditing(null);
    setDefaultDate(dateStr);
    setDialogOpen(true);
  }
  function openEvent(e: CalEvent) {
    setEditing(e);
    setDefaultDate(undefined);
    setDialogOpen(true);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-hairline px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-1">
          <button className="icon-btn" onClick={() => setDate(addDays(date, -1))} aria-label="Día anterior">
            <ChevronLeft size={17} />
          </button>
          <button className="icon-btn" onClick={() => setDate(addDays(date, 1))} aria-label="Día siguiente">
            <ChevronRight size={17} />
          </button>
          <button
            onClick={() => setDate(new Date())}
            className={cn(
              "ml-1 rounded-md px-2 py-1 text-[13px] font-medium transition-colors",
              isToday ? "text-ink-tertiary" : "text-accent hover:bg-accent-soft"
            )}
          >
            Hoy
          </button>
        </div>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold text-ink first-letter:uppercase">
            {format(date, "EEEE d 'de' MMMM", { locale: es })}
          </div>
          <div className="text-2xs text-ink-secondary">{summary()}</div>
        </div>
        <div className="flex-1" />
        <button
          onClick={newEvent}
          className="hidden items-center gap-1.5 rounded-lg border border-hairline px-2.5 py-1.5 text-[13px] text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink sm:inline-flex"
        >
          <Plus size={14} /> Evento
        </button>
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: "list", label: "Lista", icon: <List size={14} /> },
            { value: "grid", label: "Timeline", icon: <CalendarRange size={14} /> },
          ]}
        />
      </div>

      {view === "list" ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-2xl px-4 py-5 sm:px-6">
            {timeline.length === 0 && paraHoy.length === 0 ? (
              <EmptyState
                emoji="🗓️"
                title={isToday ? "Tu día está libre" : "Nada agendado este día"}
                hint="Ponele horario a una tarea (campo Agenda en su detalle) o creá un evento para bloquear el tiempo."
                className="mt-10"
                action={
                  <button
                    onClick={newEvent}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-[13px] font-medium text-accent-fg transition hover:opacity-90"
                  >
                    <Plus size={15} /> Nuevo evento
                  </button>
                }
              />
            ) : (
              <>
                <div className="space-y-1.5">
                  {timeline.map((item) =>
                    item.kind === "task" ? (
                      <TaskRow key={`t-${item.task.id}`} item={item} />
                    ) : (
                      <EventRow key={`e-${item.event.id}`} item={item} onOpen={() => openEvent(item.event)} />
                    )
                  )}
                </div>
                {paraHoy.length > 0 && (
                  <div className="mt-6">
                    <div className="mb-2 flex items-center gap-1.5 px-1 text-2xs font-semibold uppercase tracking-wide text-ink-tertiary">
                      <CalendarClock size={13} /> Para hoy · sin horario
                    </div>
                    <div className="space-y-1">
                      {paraHoy.map((t) => (
                        <UnscheduledRow key={t.id} task={t} dateStr={dateStr} />
                      ))}
                    </div>
                  </div>
                )}
                <button
                  onClick={newEvent}
                  className="mt-4 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] text-ink-tertiary transition-colors hover:bg-surface-hover hover:text-ink-secondary"
                >
                  <Plus size={15} /> Agregar evento
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <DayTimeline
          items={timeline}
          isToday={isToday}
          onOpenTask={(id) => openPeek({ kind: "task", id })}
          onOpenEvent={openEvent}
        />
      )}

      <EventDialog open={dialogOpen} onOpenChange={setDialogOpen} event={editing} defaultDate={defaultDate} />
    </div>
  );
}

/* ---------------- Timeline propio (vista Grilla) ---------------- */

const START_H = 7;
const END_H = 23;
const HOUR = 56; // px por hora

function DayTimeline({
  items,
  isToday,
  onOpenTask,
  onOpenEvent,
}: {
  items: Item[];
  isToday: boolean;
  onOpenTask: (id: string) => void;
  onOpenEvent: (e: CalEvent) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const total = (END_H - START_H) * HOUR;
  const hours = Array.from({ length: END_H - START_H }, (_, i) => START_H + i);

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowTop = isToday ? ((nowMin - START_H * 60) / 60) * HOUR : -1;

  const allDay = items.filter((i) => i.kind === "event" && (i as any).allDay) as Extract<Item, { kind: "event" }>[];
  const timed = items.filter((i) => !(i.kind === "event" && (i as any).allDay));

  // lanes para solapamientos
  const placed = useMemo(() => {
    const withMin = timed
      .map((it) => {
        const s = minutesOf(it.start);
        const e = it.end ? minutesOf(it.end) : s + 60;
        return { it, s, e: Math.max(e, s + 30) };
      })
      .sort((a, b) => a.s - b.s);
    const laneEnds: number[] = [];
    const out = withMin.map((x) => {
      let lane = laneEnds.findIndex((end) => end <= x.s);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(0);
      }
      laneEnds[lane] = x.e;
      return { ...x, lane };
    });
    return { out, lanes: Math.max(1, laneEnds.length) };
  }, [timed]);

  useEffect(() => {
    const target = ((Math.max(nowMin, 8 * 60) - START_H * 60) / 60) * HOUR - 60;
    scrollRef.current?.scrollTo({ top: Math.max(0, target) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
      {allDay.length > 0 && (
        <div className="mx-auto flex max-w-3xl flex-wrap gap-1.5 px-4 pt-3 sm:px-6">
          {allDay.map((i) => (
            <button
              key={i.event.id}
              onClick={() => onOpenEvent(i.event)}
              className="rounded-md px-2 py-1 text-2xs font-medium"
              style={{ background: i.color, color: readableText(i.color) }}
            >
              {i.event.title}
            </button>
          ))}
        </div>
      )}
      <div className="mx-auto max-w-3xl px-3 py-4 sm:px-6">
        <div className="flex">
          {/* gutter de horas */}
          <div className="relative w-12 shrink-0" style={{ height: total }}>
            {hours.map((h) => (
              <div
                key={h}
                className="absolute right-2 -translate-y-1/2 text-2xs tabular-nums text-ink-tertiary"
                style={{ top: (h - START_H) * HOUR }}
              >
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {/* track */}
          <div className="relative flex-1 rounded-xl border border-hairline bg-surface/30" style={{ height: total }}>
            {hours.map((h) => (
              <div
                key={h}
                className="absolute left-0 right-0 border-t border-hairline/70"
                style={{ top: (h - START_H) * HOUR }}
              />
            ))}

            {isToday && nowTop >= 0 && nowTop <= total && (
              <div className="absolute left-0 right-0 z-20" style={{ top: nowTop }}>
                <div className="relative border-t-2 border-[#E5624F]">
                  <span className="absolute -left-1 -top-[5px] h-2.5 w-2.5 rounded-full bg-[#E5624F]" />
                  <span className="absolute -top-2 right-1 rounded bg-[#E5624F] px-1 text-[10px] font-medium tabular-nums text-white">
                    {String(now.getHours()).padStart(2, "0")}:{String(now.getMinutes()).padStart(2, "0")}
                  </span>
                </div>
              </div>
            )}

            {placed.out.map(({ it, s, e, lane }) => {
              const top = ((s - START_H * 60) / 60) * HOUR;
              const height = Math.max(((e - s) / 60) * HOUR - 3, 24);
              const w = 100 / placed.lanes;
              const isTask = it.kind === "task";
              const title = isTask ? it.task.title : it.event.title;
              const done = isTask && it.task.status === "done";
              return (
                <button
                  key={isTask ? `t-${it.task.id}` : `e-${it.event.id}`}
                  onClick={() => (isTask ? onOpenTask(it.task.id) : onOpenEvent(it.event))}
                  className={cn(
                    "absolute z-10 overflow-hidden rounded-lg px-2 py-1 text-left shadow-sm transition-shadow hover:shadow-float",
                    done && "opacity-60"
                  )}
                  style={{
                    top,
                    height,
                    left: `calc(${lane * w}% + 2px)`,
                    width: `calc(${w}% - 4px)`,
                    background: it.color,
                    color: readableText(it.color),
                  }}
                >
                  <div className={cn("truncate text-[12px] font-semibold leading-tight", done && "line-through")}>
                    {title}
                  </div>
                  {height > 30 && (
                    <div className="truncate text-[10px] tabular-nums opacity-90">
                      {it.start}
                      {it.end ? `–${it.end}` : ""}
                    </div>
                  )}
                </button>
              );
            })}

            {timed.length === 0 && (
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-6 text-center">
                <p className="text-[13px] text-ink-tertiary">
                  {isToday ? "Sin bloques hoy." : "Sin bloques este día."}{" "}
                  <span className="text-ink-secondary">Agendá una tarea o creá un evento.</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- filas de la lista ---------------- */

function TimeCol({ start, end, allDay }: { start: string; end: string | null; allDay?: boolean }) {
  return (
    <div className="w-[52px] shrink-0 py-2.5 pl-3 text-right tnum">
      {allDay ? (
        <div className="text-2xs font-medium text-ink-tertiary">todo el día</div>
      ) : (
        <>
          <div className="text-[13px] font-semibold text-ink">{start}</div>
          {end && <div className="text-2xs text-ink-tertiary">{end}</div>}
        </>
      )}
    </div>
  );
}

function TaskRow({ item }: { item: Extract<Item, { kind: "task" }> }) {
  const openPeek = useUI((s) => s.openPeek);
  const toggle = useToggleTask();
  const { sounds, celebrate } = usePrefs();
  const t = item.task;
  const done = t.status === "done";
  const dur = durationLabel(item.start, item.end);
  return (
    <button
      onClick={() => openPeek({ kind: "task", id: t.id })}
      className="group flex w-full items-stretch gap-1 overflow-hidden rounded-xl border border-hairline bg-canvas text-left shadow-card transition-shadow hover:shadow-subtle"
    >
      <TimeCol start={item.start} end={item.end} />
      <div className="my-2.5 w-1 shrink-0 rounded-full" style={{ background: item.color }} />
      <div className="min-w-0 flex-1 py-2.5 pl-1.5 pr-3">
        <div className="flex items-center gap-2">
          <StatusCheckbox
            checked={done}
            size={16}
            onToggle={() => {
              toggle.mutate({ task: t, done: !done });
              if (!done) {
                if (celebrate) fireConfetti();
                if (sounds) playChime();
              }
            }}
          />
          <span className={cn("truncate text-[14px] font-medium text-ink", done && "text-ink-tertiary line-through")}>
            {t.title}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 pl-[26px] text-2xs text-ink-tertiary">
          {dur && <span className="tnum">{dur}</span>}
          {t.project && <span className="truncate">{t.project.emoji} {t.project.name}</span>}
        </div>
      </div>
    </button>
  );
}

function EventRow({ item, onOpen }: { item: Extract<Item, { kind: "event" }>; onOpen: () => void }) {
  const e = item.event;
  return (
    <button
      onClick={onOpen}
      className="group flex w-full items-stretch gap-1 overflow-hidden rounded-xl border border-hairline bg-canvas text-left shadow-card transition-shadow hover:shadow-subtle"
    >
      <TimeCol start={item.start} end={item.end} allDay={item.allDay} />
      <div className="my-2.5 w-1 shrink-0 rounded-full" style={{ background: item.color }} />
      <div className="min-w-0 flex-1 py-2.5 pl-1.5 pr-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: item.color }} />
          <span className="truncate text-[14px] font-medium text-ink">{e.title}</span>
        </div>
        {e.description && <div className="mt-0.5 truncate pl-[18px] text-2xs text-ink-tertiary">{e.description}</div>}
      </div>
    </button>
  );
}

function UnscheduledRow({ task, dateStr }: { task: TaskWithTags; dateStr: string }) {
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
