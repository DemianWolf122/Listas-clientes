"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin, { Draggable } from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";
import { format } from "date-fns";
import { CalendarClock } from "lucide-react";
import { useAllTasks, useUpdateTask, useMyTasks } from "@/hooks/tasks";
import { useEvents, useUpdateEvent } from "@/hooks/events";
import { useIdentity } from "@/stores/identity";
import { useUI } from "@/stores/ui";
import { EventDialog } from "@/components/calendar/EventDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { PriorityDot } from "@/components/tasks/controls";
import type { CalEvent } from "@/lib/types/database";

const localDate = (d: Date) => format(d, "yyyy-MM-dd");
const localTime = (d: Date) => format(d, "HH:mm:ss");

export function AgendaView() {
  const me = useIdentity((s) => s.profileId);
  const { data: tasks } = useAllTasks();
  const { data: myTasks } = useMyTasks(me);
  const { data: events } = useEvents();
  const updateTask = useUpdateTask();
  const updateEvent = useUpdateEvent();
  const openPeek = useUI((s) => s.openPeek);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CalEvent | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>();
  const panelRef = useRef<HTMLDivElement>(null);

  const fcEvents = useMemo(() => {
    const taskBlocks = (tasks ?? [])
      .filter((t) => t.start_date && t.start_time)
      .map((t) => ({
        id: `task:${t.id}`,
        title: t.title,
        start: `${t.start_date}T${t.start_time}`,
        end: t.end_time ? `${t.start_date}T${t.end_time}` : undefined,
        backgroundColor: t.project?.color ?? "#2383E2",
        borderColor: "transparent",
        classNames: t.status === "done" ? ["fc-done"] : [],
      }));
    const evts = (events ?? []).map((e) => ({
      id: `evt:${e.id}`,
      title: e.title,
      start: e.starts_at,
      end: e.ends_at ?? undefined,
      allDay: e.all_day,
      backgroundColor: e.color ?? "#8E7CC3",
      borderColor: "transparent",
    }));
    return [...taskBlocks, ...evts];
  }, [tasks, events]);

  const unscheduled = useMemo(
    () => (myTasks ?? []).filter((t) => t.status !== "done" && !(t.start_date && t.start_time)),
    [myTasks]
  );

  // arrastre de tareas sin agendar hacia la grilla (desktop)
  useEffect(() => {
    if (!panelRef.current) return;
    const drag = new Draggable(panelRef.current, {
      itemSelector: ".agenda-chip",
      eventData: (el) => ({
        id: `task:${(el as HTMLElement).dataset.taskId}`,
        title: (el as HTMLElement).dataset.title,
        duration: "01:00",
      }),
    });
    return () => drag.destroy();
  }, []);

  function onEventClick(info: any) {
    const id = String(info.event.id);
    if (id.startsWith("task:")) openPeek({ kind: "task", id: id.slice(5) });
    else {
      const ev = (events ?? []).find((e) => e.id === id.slice(4));
      if (ev) {
        setEditing(ev);
        setDefaultDate(undefined);
        setDialogOpen(true);
      }
    }
  }

  function applyEvent(info: any) {
    const id = String(info.event.id);
    const s: Date | null = info.event.start;
    const e: Date | null = info.event.end;
    if (!s) return;
    if (id.startsWith("task:")) {
      updateTask.mutate({
        id: id.slice(5),
        start_date: localDate(s),
        start_time: localTime(s),
        end_time: e ? localTime(e) : null,
      });
    } else {
      updateEvent.mutate({ id: id.slice(4), starts_at: s.toISOString(), ends_at: e ? e.toISOString() : null });
    }
  }

  function onReceive(info: any) {
    const id = String(info.event.id);
    const s: Date | null = info.event.start;
    if (id.startsWith("task:") && s) {
      const e: Date | null = info.event.end;
      updateTask.mutate({
        id: id.slice(5),
        start_date: localDate(s),
        start_time: localTime(s),
        end_time: e ? localTime(e) : null,
      });
    }
    info.event.remove(); // el refetch la trae como bloque real
  }

  return (
    <div className="flex h-full min-h-0">
      {/* panel sin agendar (desktop) */}
      <aside ref={panelRef} className="hidden w-60 shrink-0 flex-col border-r border-hairline md:flex">
        <div className="border-b border-hairline px-3 py-2.5 text-[13px] font-semibold text-ink">
          Sin agendar
          <span className="ml-1.5 text-2xs font-normal text-ink-tertiary">{unscheduled.length}</span>
        </div>
        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2">
          {unscheduled.length === 0 ? (
            <p className="px-1 py-4 text-2xs text-ink-tertiary">Todo tu trabajo tiene horario 🎯</p>
          ) : (
            unscheduled.map((t) => (
              <div
                key={t.id}
                className="agenda-chip cursor-grab rounded-lg border border-hairline bg-canvas p-2 text-[13px] shadow-card active:cursor-grabbing"
                data-task-id={t.id}
                data-title={t.title}
                onClick={() => openPeek({ kind: "task", id: t.id })}
              >
                <div className="flex items-center gap-1.5">
                  <PriorityDot value={t.priority} />
                  <span className="line-clamp-2 flex-1 text-ink">{t.title}</span>
                </div>
                {t.project && <div className="mt-1 text-2xs text-ink-tertiary">{t.project.emoji} {t.project.name}</div>}
              </div>
            ))
          )}
        </div>
        <p className="border-t border-hairline px-3 py-2 text-[11px] leading-tight text-ink-tertiary">
          Arrastrá una tarea a la grilla para agendarla.
        </p>
      </aside>

      {/* grilla horaria */}
      <div className="atrio-calendar min-h-0 flex-1 p-3">
        {/* strip mobile de tareas sin agendar */}
        {unscheduled.length > 0 && (
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1 md:hidden">
            {unscheduled.map((t) => (
              <button
                key={t.id}
                onClick={() => openPeek({ kind: "task", id: t.id })}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-hairline bg-canvas px-2.5 py-1 text-2xs text-ink"
              >
                <PriorityDot value={t.priority} />
                <span className="max-w-[140px] truncate">{t.title}</span>
              </button>
            ))}
          </div>
        )}
        <FullCalendar
          plugins={[timeGridPlugin, interactionPlugin]}
          initialView="timeGridDay"
          locale={esLocale}
          firstDay={1}
          nowIndicator
          allDaySlot={false}
          slotMinTime="06:00:00"
          slotMaxTime="24:00:00"
          scrollTime="08:00:00"
          height="100%"
          headerToolbar={{ left: "prev,next today", center: "title", right: "timeGridDay,timeGridWeek" }}
          buttonText={{ today: "hoy", day: "día", week: "semana" }}
          events={fcEvents}
          editable
          droppable
          eventClick={onEventClick}
          eventDrop={applyEvent}
          eventResize={applyEvent}
          eventReceive={onReceive}
          dateClick={(info: any) => {
            setEditing(null);
            setDefaultDate(String(info.dateStr).slice(0, 10));
            setDialogOpen(true);
          }}
        />
      </div>

      <EventDialog open={dialogOpen} onOpenChange={setDialogOpen} event={editing} defaultDate={defaultDate} />
    </div>
  );
}
