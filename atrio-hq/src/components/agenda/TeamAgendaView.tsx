"use client";

import { useState } from "react";
import { format, startOfWeek, addDays as fnsAddDays, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, List, LayoutGrid, Plus, Users, CalendarClock } from "lucide-react";
import { useProfiles, useProfileMap } from "@/hooks/profiles";
import { useUI } from "@/stores/ui";
import { Segmented } from "@/components/ui/Segmented";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { EventDialog } from "@/components/calendar/EventDialog";
import { WeekBoard, AgendaCard, useAgendaCards, ymd } from "./shared";
import { cn } from "@/lib/utils";
import type { CalEvent } from "@/lib/types/database";

export function TeamAgendaView() {
  const profileMap = useProfileMap();
  const { data: profiles } = useProfiles();
  const cardsByDay = useAgendaCards(); // todos: sin filtro de persona
  const openPeek = useUI((s) => s.openPeek);

  const [view, setView] = useState<"week" | "day">("day");
  const [date, setDate] = useState<Date>(() => new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CalEvent | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>();

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
  const onOpenTask = (id: string) => openPeek({ kind: "task", id });

  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => fnsAddDays(weekStart, i));
  const rangeLabel = `${format(weekStart, "d")}–${format(fnsAddDays(weekStart, 6), "d 'de' MMMM", { locale: es })}`;

  const dayCards = cardsByDay[ymd(date)] ?? [];
  const events = dayCards.filter((c) => c.kind === "event");
  const unassigned = dayCards.filter((c) => c.kind === "task" && !c.assigneeId);

  // columnas: una por persona (+ "Sin asignar" si hace falta)
  const columns = [
    ...(profiles ?? []).map((p) => ({
      key: p.id,
      profile: p,
      cards: dayCards.filter((c) => c.kind === "task" && c.assigneeId === p.id),
    })),
    ...(unassigned.length ? [{ key: "none", profile: null, cards: unassigned }] : []),
  ];

  return (
    <div className="flex h-full flex-col bg-surface/40">
      {/* header */}
      <div className="flex flex-wrap items-center gap-2 border-b border-hairline bg-canvas px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-1">
          <button className="icon-btn" onClick={() => setDate(fnsAddDays(date, view === "week" ? -7 : -1))} aria-label="Anterior">
            <ChevronLeft size={17} />
          </button>
          <button className="icon-btn" onClick={() => setDate(fnsAddDays(date, view === "week" ? 7 : 1))} aria-label="Siguiente">
            <ChevronRight size={17} />
          </button>
          <button
            onClick={() => setDate(new Date())}
            className="ml-1 rounded-md px-2 py-1 text-[13px] font-medium text-accent transition-colors hover:bg-accent-soft"
          >
            Hoy
          </button>
        </div>
        <div className="flex min-w-0 items-center gap-1.5 text-[15px] font-semibold text-ink first-letter:uppercase">
          <Users size={16} className="text-ink-tertiary" />
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
            { value: "day", label: "Día", icon: <List size={14} /> },
            { value: "week", label: "Semana", icon: <LayoutGrid size={14} /> },
          ]}
        />
      </div>

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
                  selected ? "border-transparent bg-ink text-canvas" : "border-hairline bg-canvas hover:bg-surface-hover",
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
          onDayHeaderClick={(day) => {
            setDate(day);
            setView("day");
          }}
          onNewEvent={(dayStr) => newEvent(dayStr)}
          onOpenTask={onOpenTask}
          onOpenEvent={openEvent}
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-auto p-3 sm:px-4">
          {/* eventos compartidos del día */}
          {events.length > 0 && (
            <div className="mb-3 rounded-xl border border-hairline bg-canvas p-2.5">
              <div className="mb-1.5 flex items-center gap-1.5 px-0.5 text-2xs font-semibold uppercase tracking-wide text-ink-tertiary">
                <CalendarClock size={13} /> Eventos del día
              </div>
              <div className="flex flex-wrap gap-2">
                {events.map((c) => (
                  <div key={c.key} className="w-[220px]">
                    <AgendaCard card={c} profileMap={profileMap} onOpenTask={onOpenTask} onOpenEvent={openEvent} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {columns.every((c) => c.cards.length === 0) && events.length === 0 ? (
            <EmptyState
              emoji="🗓️"
              title={isSameDay(date, new Date()) ? "El equipo no tiene nada agendado hoy" : "Nada agendado este día"}
              hint="Ponéle horario a las tareas o creá un evento para verlo acá."
              className="mt-10"
            />
          ) : (
            <div className="flex min-w-fit gap-2.5">
              {columns.map((col) => (
                <div key={col.key} className="flex min-w-[210px] flex-1 flex-col sm:min-w-[240px]">
                  {/* cabecera de la persona */}
                  <div className="mb-2 flex items-center gap-2 rounded-xl border border-hairline bg-canvas px-3 py-2">
                    {col.profile ? (
                      <Avatar profile={col.profile} size={26} />
                    ) : (
                      <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-surface text-ink-tertiary">
                        <Users size={14} />
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink">
                      {col.profile?.name ?? "Sin asignar"}
                    </span>
                    <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-2xs font-medium text-ink-secondary">
                      {col.cards.length}
                    </span>
                  </div>
                  {/* cards de la persona */}
                  <div className="min-h-[60px] flex-1 space-y-2 rounded-xl">
                    {col.cards.map((c) => (
                      <AgendaCard key={c.key} card={c} profileMap={profileMap} onOpenTask={onOpenTask} onOpenEvent={openEvent} />
                    ))}
                    {col.cards.length === 0 && (
                      <div className="rounded-xl border border-dashed border-hairline py-4 text-center text-2xs text-ink-tertiary">
                        Sin tareas con horario
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <EventDialog open={dialogOpen} onOpenChange={setDialogOpen} event={editing} defaultDate={defaultDate} />
    </div>
  );
}
