"use client";

import { useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";
import { format } from "date-fns";
import { useAllTasks, useUpdateTask } from "@/hooks/tasks";
import { useEvents, useUpdateEvent } from "@/hooks/events";
import { useUI } from "@/stores/ui";
import { EventDialog } from "./EventDialog";
import type { CalEvent } from "@/lib/types/database";

export function CalendarView({ projectId }: { projectId?: string }) {
  const { data: tasks } = useAllTasks();
  const { data: events } = useEvents();
  const updateTask = useUpdateTask();
  const updateEvent = useUpdateEvent();
  const openPeek = useUI((s) => s.openPeek);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CalEvent | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>();
  const [defaultTime, setDefaultTime] = useState<string | undefined>();

  const fcEvents = useMemo(() => {
    const out: any[] = [];
    (tasks ?? [])
      .filter((t) => !projectId || t.project_id === projectId)
      .forEach((t) => {
        const scheduled = Boolean(t.start_date && t.start_time);
        // Bloque agendado → evento con hora (visible en la vista semana, arrastrable).
        if (scheduled) {
          out.push({
            id: `sched:${t.id}`,
            title: t.title,
            start: `${t.start_date}T${t.start_time}`,
            end: t.end_time ? `${t.start_date}T${t.end_time}` : undefined,
            allDay: false,
            backgroundColor: t.project?.color ?? "#2383E2",
            borderColor: "transparent",
            classNames: t.status === "done" ? ["fc-done"] : [],
          });
        }
        // Entrega → todo el día en su fecha (salvo que coincida con el bloque).
        if (t.due_date && !(scheduled && t.start_date === t.due_date)) {
          out.push({
            id: `task:${t.id}`,
            title: t.title,
            start: t.due_date,
            allDay: true,
            backgroundColor: t.project?.color ?? "#2383E2",
            borderColor: "transparent",
            classNames: t.status === "done" ? ["fc-done"] : [],
          });
        }
      });
    (events ?? [])
      .filter((e) => !projectId || e.project_id === projectId)
      .forEach((e) => {
        out.push({
          id: `evt:${e.id}`,
          title: e.title,
          start: e.starts_at,
          end: e.ends_at ?? undefined,
          allDay: e.all_day,
          backgroundColor: e.color ?? "#8E7CC3",
          borderColor: "transparent",
        });
      });
    return out;
  }, [tasks, events, projectId]);

  function onEventClick(info: any) {
    const id = String(info.event.id);
    if (id.startsWith("task:")) {
      openPeek({ kind: "task", id: id.slice(5) });
    } else if (id.startsWith("sched:")) {
      openPeek({ kind: "task", id: id.slice(6) });
    } else {
      const ev = (events ?? []).find((e) => e.id === id.slice(4));
      if (ev) {
        setEditing(ev);
        setDefaultDate(undefined);
        setDefaultTime(undefined);
        setDialogOpen(true);
      }
    }
  }

  function onDateClick(info: any) {
    const ds = String(info.dateStr);
    setEditing(null);
    setDefaultDate(ds.slice(0, 10));
    // En la vista semana el click trae hora → la sugerimos en el diálogo.
    setDefaultTime(ds.length > 10 ? ds.slice(11, 16) : undefined);
    setDialogOpen(true);
  }

  function onEventDrop(info: any) {
    const id = String(info.event.id);
    const start: Date | null = info.event.start;
    if (!start) return;
    if (id.startsWith("task:")) {
      // format() usa la zona local → el día que se ve es el día que se guarda.
      updateTask.mutate({ id: id.slice(5), due_date: format(start, "yyyy-MM-dd") });
    } else if (id.startsWith("sched:")) {
      updateTask.mutate({
        id: id.slice(6),
        start_date: format(start, "yyyy-MM-dd"),
        start_time: format(start, "HH:mm:ss"),
        ...(info.event.end ? { end_time: format(info.event.end, "HH:mm:ss") } : {}),
      });
    } else {
      updateEvent.mutate({
        id: id.slice(4),
        starts_at: start.toISOString(),
        ends_at: info.event.end ? info.event.end.toISOString() : null,
      });
    }
  }

  return (
    <div className="atrio-calendar h-full p-4">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale={esLocale}
        firstDay={1}
        headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek" }}
        buttonText={{ today: "hoy", month: "mes", week: "semana" }}
        events={fcEvents}
        editable
        eventStartEditable
        dayMaxEvents={3}
        height="100%"
        eventClick={onEventClick}
        dateClick={onDateClick}
        eventDrop={onEventDrop}
        eventResize={onEventDrop}
      />
      <EventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        event={editing}
        defaultDate={defaultDate}
        defaultTime={defaultTime}
      />
    </div>
  );
}
