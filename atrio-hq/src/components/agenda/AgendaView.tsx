"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, List, Columns3, CalendarClock, Plus } from "lucide-react";
import { useAllTasks, useMyTasks, useUpdateTask, useToggleTask, type TaskWithTags } from "@/hooks/tasks";
import { useEvents, useUpdateEvent } from "@/hooks/events";
import { useIdentity } from "@/stores/identity";
import { useUI, usePrefs } from "@/stores/ui";
import { Segmented } from "@/components/ui/Segmented";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusCheckbox, PriorityDot, ScheduleControl, DueChip } from "@/components/tasks/controls";
import { EventDialog } from "@/components/calendar/EventDialog";
import { fireConfetti } from "@/lib/confetti";
import { playChime } from "@/lib/sound";
import { hm, timeOfDay, cn } from "@/lib/utils";
import type { CalEvent } from "@/lib/types/database";

const ymd = (d: Date) => format(d, "yyyy-MM-dd");
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

function minutesOf(t?: string | null) {
  if (!t) return 0;
  const [h, m] = hm(t).split(":").map(Number);
  return h * 60 + m;
}
function durationLabel(start?: string | null, end?: string | null) {
  if (!start || !end) return "";
  let mins = minutesOf(end) - minutesOf(start);
  if (mins <= 0) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return [h ? `${h} h` : "", m ? `${m} min` : ""].filter(Boolean).join(" ");
}

type Item =
  | { kind: "task"; sort: number; start: string; end: string | null; task: TaskWithTags; color: string }
  | { kind: "event"; sort: number; start: string; end: string | null; allDay: boolean; event: CalEvent; color: string };

export function AgendaView() {
  const me = useIdentity((s) => s.profileId);
  const { data: tasks } = useAllTasks();
  const { data: myTasks } = useMyTasks(me);
  const { data: events } = useEvents();
  const updateTask = useUpdateTask();
  const updateEvent = useUpdateEvent();
  const openPeek = useUI((s) => s.openPeek);

  const [view, setView] = useState<"list" | "grid">("list");
  const [date, setDate] = useState<Date>(() => new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CalEvent | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>();
  const calRef = useRef<FullCalendar>(null);
  const dateStr = ymd(date);
  const isToday = ymd(new Date()) === dateStr;

  useEffect(() => {
    if (view === "grid") calRef.current?.getApi().gotoDate(date);
  }, [view, date]);

  // ítems del día (bloques de tareas + eventos), ordenados
  const timeline = useMemo<Item[]>(() => {
    const taskItems: Item[] = (tasks ?? [])
      .filter((t) => t.start_date === dateStr && t.start_time)
      .map((t) => ({
        kind: "task",
        sort: minutesOf(t.start_time),
        start: hm(t.start_time),
        end: t.end_time ? hm(t.end_time) : null,
        task: t,
        color: t.project?.color ?? "#2383E2",
      }));
    const evItems: Item[] = (events ?? [])
      .filter((e) => format(parseISO(e.starts_at), "yyyy-MM-dd") === dateStr)
      .map((e) => ({
        kind: "event",
        sort: e.all_day ? -1 : minutesOf(timeOfDay(e.starts_at)),
        start: e.all_day ? "" : timeOfDay(e.starts_at),
        end: e.ends_at ? timeOfDay(e.ends_at) : null,
        allDay: e.all_day,
        event: e,
        color: e.color ?? "#8E7CC3",
      }));
    return [...taskItems, ...evItems].sort((a, b) => a.sort - b.sort);
  }, [tasks, events, dateStr]);

  // "para hoy" — mis tareas pendientes con vencimiento hoy y sin bloque horario
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

  function openEvent(e: CalEvent) {
    setEditing(e);
    setDefaultDate(undefined);
    setDialogOpen(true);
  }

  return (
    <div className="flex h-full flex-col">
      {/* header con navegación de día + toggle */}
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
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: "list", label: "Lista", icon: <List size={14} /> },
            { value: "grid", label: "Grilla", icon: <Columns3 size={14} /> },
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
                    onClick={() => {
                      setEditing(null);
                      setDefaultDate(dateStr);
                      setDialogOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-[13px] font-medium text-accent-fg transition hover:opacity-90"
                  >
                    <Plus size={15} /> Nuevo evento
                  </button>
                }
              />
            ) : (
              <>
                {/* timeline del día */}
                <div className="space-y-1.5">
                  {timeline.map((item) =>
                    item.kind === "task" ? (
                      <TaskRow key={`t-${item.task.id}`} item={item} />
                    ) : (
                      <EventRow key={`e-${item.event.id}`} item={item} onOpen={() => openEvent(item.event)} />
                    )
                  )}
                </div>

                {/* para hoy sin horario */}
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
                  onClick={() => {
                    setEditing(null);
                    setDefaultDate(dateStr);
                    setDialogOpen(true);
                  }}
                  className="mt-4 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] text-ink-tertiary transition-colors hover:bg-surface-hover hover:text-ink-secondary"
                >
                  <Plus size={15} /> Agregar evento
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="atrio-calendar min-h-0 flex-1 p-3">
          <FullCalendar
            ref={calRef}
            plugins={[timeGridPlugin, interactionPlugin]}
            initialView="timeGridDay"
            initialDate={dateStr}
            locale={esLocale}
            headerToolbar={false}
            nowIndicator
            allDaySlot={false}
            slotMinTime="07:00:00"
            slotMaxTime="23:00:00"
            scrollTime="08:00:00"
            slotDuration="00:30:00"
            slotLabelInterval="01:00"
            expandRows
            height="100%"
            eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
            events={[
              ...(tasks ?? [])
                .filter((t) => t.start_date && t.start_time)
                .map((t) => ({
                  id: `task:${t.id}`,
                  title: t.title,
                  start: `${t.start_date}T${t.start_time}`,
                  end: t.end_time ? `${t.start_date}T${t.end_time}` : undefined,
                  backgroundColor: t.project?.color ?? "#2383E2",
                  borderColor: "transparent",
                  classNames: t.status === "done" ? ["fc-done"] : [],
                })),
              ...(events ?? []).map((e) => ({
                id: `evt:${e.id}`,
                title: e.title,
                start: e.starts_at,
                end: e.ends_at ?? undefined,
                allDay: e.all_day,
                backgroundColor: e.color ?? "#8E7CC3",
                borderColor: "transparent",
              })),
            ]}
            editable
            eventContent={(arg: any) => (
              <div className="flex h-full flex-col overflow-hidden px-1.5 py-0.5 leading-tight">
                <span className="truncate text-[12px] font-semibold">{arg.event.title}</span>
                {arg.timeText && <span className="text-[10px] opacity-85">{arg.timeText}</span>}
              </div>
            )}
            eventClick={(info: any) => {
              const id = String(info.event.id);
              if (id.startsWith("task:")) openPeek({ kind: "task", id: id.slice(5) });
              else {
                const ev = (events ?? []).find((e) => e.id === id.slice(4));
                if (ev) openEvent(ev);
              }
            }}
            eventDrop={(info: any) => applyDrag(info, updateTask, updateEvent)}
            eventResize={(info: any) => applyDrag(info, updateTask, updateEvent)}
            dateClick={(info: any) => {
              setEditing(null);
              setDefaultDate(String(info.dateStr).slice(0, 10));
              setDialogOpen(true);
            }}
          />
        </div>
      )}

      <EventDialog open={dialogOpen} onOpenChange={setDialogOpen} event={editing} defaultDate={defaultDate} />
    </div>
  );
}

function applyDrag(info: any, updateTask: any, updateEvent: any) {
  const id = String(info.event.id);
  const s: Date | null = info.event.start;
  const e: Date | null = info.event.end;
  if (!s) return;
  if (id.startsWith("task:")) {
    updateTask.mutate({
      id: id.slice(5),
      start_date: format(s, "yyyy-MM-dd"),
      start_time: format(s, "HH:mm:ss"),
      end_time: e ? format(e, "HH:mm:ss") : null,
    });
  } else {
    updateEvent.mutate({ id: id.slice(4), starts_at: s.toISOString(), ends_at: e ? e.toISOString() : null });
  }
}

/* -------- filas del timeline (lista) -------- */

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
