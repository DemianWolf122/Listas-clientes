"use client";

import { useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";
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

  const fcEvents = useMemo(() => {
    const taskEvents = (tasks ?? [])
      .filter((t) => t.due_date && (!projectId || t.project_id === projectId))
      .map((t) => ({
        id: `task:${t.id}`,
        title: t.title,
        start: t.due_date!,
        allDay: true,
        backgroundColor: t.project?.color ?? "#2383E2",
        borderColor: "transparent",
        classNames: t.status === "done" ? ["fc-done"] : [],
      }));
    const evtEvents = (events ?? [])
      .filter((e) => !projectId || e.project_id === projectId)
      .map((e) => ({
        id: `evt:${e.id}`,
        title: e.title,
        start: e.starts_at,
        end: e.ends_at ?? undefined,
        allDay: e.all_day,
        backgroundColor: e.color ?? "#8E7CC3",
        borderColor: "transparent",
      }));
    return [...taskEvents, ...evtEvents];
  }, [tasks, events, projectId]);

  function onEventClick(info: any) {
    const id = String(info.event.id);
    if (id.startsWith("task:")) {
      openPeek({ kind: "task", id: id.slice(5) });
    } else {
      const ev = (events ?? []).find((e) => e.id === id.slice(4));
      if (ev) {
        setEditing(ev);
        setDefaultDate(undefined);
        setDialogOpen(true);
      }
    }
  }

  function onDateClick(info: any) {
    setEditing(null);
    setDefaultDate(String(info.dateStr).slice(0, 10));
    setDialogOpen(true);
  }

  function onEventDrop(info: any) {
    const id = String(info.event.id);
    if (id.startsWith("task:")) {
      const date = info.event.start?.toISOString().slice(0, 10);
      if (date) updateTask.mutate({ id: id.slice(5), due_date: date });
    } else {
      const starts = info.event.start?.toISOString();
      if (starts) updateEvent.mutate({ id: id.slice(4), starts_at: starts });
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
      <EventDialog open={dialogOpen} onOpenChange={setDialogOpen} event={editing} defaultDate={defaultDate} />
    </div>
  );
}
