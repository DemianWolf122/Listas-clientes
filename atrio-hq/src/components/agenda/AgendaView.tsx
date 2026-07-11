"use client";

import { useEffect, useState } from "react";
import { format, parseISO, startOfWeek, addDays as fnsAddDays, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, List, LayoutGrid, Plus, CalendarClock } from "lucide-react";
import { useUpdateTask, useToggleTask, type TaskWithTags } from "@/hooks/tasks";
import { useProfileMap } from "@/hooks/profiles";
import { useUI, usePrefs } from "@/stores/ui";
import { Segmented } from "@/components/ui/Segmented";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusCheckbox, PriorityDot, ScheduleControl, DueChip, AssigneeControl } from "@/components/tasks/controls";
import { EventDialog } from "@/components/calendar/EventDialog";
import { WeekBoard, useAgendaCards, durationLabel, ymd, SIN_HORARIO } from "./shared";
import { fireConfetti } from "@/lib/confetti";
import { playChime } from "@/lib/sound";
import { hm, timeOfDay, cn } from "@/lib/utils";
import type { CalEvent } from "@/lib/types/database";

export function AgendaView() {
  const profileMap = useProfileMap();
  const cardsByDay = useAgendaCards();
  const openPeek = useUI((s) => s.openPeek);
  const agendaFocus = useUI((s) => s.agendaFocus);
  const setAgendaFocus = useUI((s) => s.setAgendaFocus);

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

  // Salto desde el Calendario: abrir un día puntual en vista Día.
  useEffect(() => {
    if (agendaFocus) {
      setDate(parseISO(agendaFocus));
      setView("day");
      setAgendaFocus(null);
    }
  }, [agendaFocus, setAgendaFocus]);

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
        <WeekBoard
          weekDays={weekDays}
          cardsByDay={cardsByDay}
          profileMap={profileMap}
          onDayHeaderClick={goToDay}
          onNewEvent={(dayStr) => newEvent(dayStr)}
          onOpenTask={(id) => openPeek({ kind: "task", id })}
          onOpenEvent={openEvent}
        />
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
                        <UnscheduledRow key={c.key} task={c.task!} dateStr={ymd(date)} />
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
  const update = useUpdateTask();
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => openPeek({ kind: "task", id: task.id })}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openPeek({ kind: "task", id: task.id });
        }
      }}
      className="group flex w-full cursor-pointer items-stretch gap-1 overflow-hidden rounded-xl border border-hairline bg-canvas text-left shadow-card transition-shadow hover:shadow-subtle"
    >
      <div className="w-[52px] shrink-0 py-2.5 pl-3 text-right tnum">
        <div className="text-[13px] font-semibold text-ink">{timeStart || (task.due_time ? hm(task.due_time) : "")}</div>
        {timeEnd && <div className="text-2xs text-ink-tertiary">{timeEnd}</div>}
        {isEntrega && <div className="text-2xs text-ink-tertiary">entrega</div>}
      </div>
      <div className="my-2.5 w-1 shrink-0 rounded-full" style={{ background: color }} />
      <div className="min-w-0 flex-1 py-2.5 pl-1.5">
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
      <div className="flex items-center pr-2">
        <AssigneeControl
          compact
          size={20}
          value={task.assignee_id}
          onChange={(v) => update.mutate({ id: task.id, assignee_id: v, notifyAssignee: true })}
        />
      </div>
    </div>
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
      <AssigneeControl
        compact
        size={18}
        value={task.assignee_id}
        onChange={(v) => update.mutate({ id: task.id, assignee_id: v, notifyAssignee: true })}
      />
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
