"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addDays,
  addMonths,
  isSameDay,
  isSameMonth,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, LayoutGrid, Columns3 } from "lucide-react";
import { useUI } from "@/stores/ui";
import { useProfileMap } from "@/hooks/profiles";
import { Segmented } from "@/components/ui/Segmented";
import { EventDialog } from "./EventDialog";
import { WeekBoard, useAgendaCards, tint, ymd, type Card } from "@/components/agenda/shared";
import { cn } from "@/lib/utils";
import type { CalEvent } from "@/lib/types/database";

const WEEKDAYS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
const MAX_CHIPS = 3;

export function CalendarView({ projectId }: { projectId?: string }) {
  const router = useRouter();
  const cardsByDay = useAgendaCards(projectId);
  const profileMap = useProfileMap();
  const openPeek = useUI((s) => s.openPeek);
  const setAgendaFocus = useUI((s) => s.setAgendaFocus);

  const [mode, setMode] = useState<"month" | "week">("month");
  const [cursor, setCursor] = useState<Date>(() => new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CalEvent | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>();

  function newEvent(forDate?: string) {
    setEditing(null);
    setDefaultDate(forDate ?? ymd(cursor));
    setDialogOpen(true);
  }
  function openEvent(e: CalEvent) {
    setEditing(e);
    setDefaultDate(undefined);
    setDialogOpen(true);
  }
  /** Salta a ese día en la vista Día de la Agenda. */
  function goDay(day: Date) {
    setAgendaFocus(ymd(day));
    router.push("/agenda");
  }

  // celdas del mes (semanas completas, lunes a domingo)
  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const weekStart = startOfWeek(cursor, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const label =
    mode === "month"
      ? format(cursor, "MMMM yyyy", { locale: es })
      : `${format(weekStart, "d")}–${format(addDays(weekStart, 6), "d 'de' MMMM", { locale: es })}`;

  return (
    <div className="flex h-full flex-col bg-surface/40">
      {/* header (mismo lenguaje que la Agenda) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-hairline bg-canvas px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-1">
          <button
            className="icon-btn"
            onClick={() => setCursor(mode === "month" ? addMonths(cursor, -1) : addDays(cursor, -7))}
            aria-label="Anterior"
          >
            <ChevronLeft size={17} />
          </button>
          <button
            className="icon-btn"
            onClick={() => setCursor(mode === "month" ? addMonths(cursor, 1) : addDays(cursor, 7))}
            aria-label="Siguiente"
          >
            <ChevronRight size={17} />
          </button>
          <button
            onClick={() => setCursor(new Date())}
            className="ml-1 rounded-md px-2 py-1 text-[13px] font-medium text-accent transition-colors hover:bg-accent-soft"
          >
            Hoy
          </button>
        </div>
        <div className="min-w-0 text-[15px] font-semibold text-ink first-letter:uppercase">{label}</div>
        <div className="flex-1" />
        <button
          onClick={() => newEvent()}
          className="hidden items-center gap-1.5 rounded-lg bg-ink px-2.5 py-1.5 text-[13px] font-medium text-canvas transition hover:opacity-90 sm:inline-flex"
        >
          <Plus size={14} /> Nuevo evento
        </button>
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: "month", label: "Mes", icon: <LayoutGrid size={14} /> },
            { value: "week", label: "Semana", icon: <Columns3 size={14} /> },
          ]}
        />
      </div>

      {mode === "week" ? (
        <WeekBoard
          weekDays={weekDays}
          cardsByDay={cardsByDay}
          profileMap={profileMap}
          onDayHeaderClick={goDay}
          onNewEvent={(dayStr) => newEvent(dayStr)}
          onOpenTask={(id) => openPeek({ kind: "task", id })}
          onOpenEvent={openEvent}
        />
      ) : (
        <>
          {/* nombres de los días */}
          <div className="grid grid-cols-7 gap-1.5 px-3 pb-1 pt-2 sm:px-4">
            {WEEKDAYS.map((d, i) => (
              <div
                key={d}
                className={cn(
                  "text-center text-2xs font-semibold uppercase tracking-wide",
                  i >= 5 ? "text-ink-tertiary/70" : "text-ink-tertiary"
                )}
              >
                {d}
              </div>
            ))}
          </div>
          {/* grilla del mes */}
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 sm:px-4">
            <div className="grid grid-cols-7 gap-1.5">
              {monthDays.map((day) => {
                const dayStr = ymd(day);
                const cards = cardsByDay[dayStr] ?? [];
                const today = isSameDay(day, new Date());
                const inMonth = isSameMonth(day, cursor);
                return (
                  <div
                    key={dayStr}
                    role="button"
                    tabIndex={0}
                    onClick={() => goDay(day)}
                    onKeyDown={(e) => e.key === "Enter" && goDay(day)}
                    title="Ver este día en la Agenda"
                    className={cn(
                      "group flex min-h-[64px] cursor-pointer flex-col rounded-xl border border-hairline p-1 transition-colors md:min-h-[106px] md:p-1.5",
                      inMonth ? "bg-canvas hover:bg-surface-hover" : "bg-transparent opacity-50",
                      today && "bg-accent-soft/40 hover:bg-accent-soft/50"
                    )}
                  >
                    <div className="flex items-center justify-between px-0.5">
                      <span
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-full text-[12px] font-semibold tnum md:h-6 md:w-6 md:text-[13px]",
                          today ? "bg-ink text-canvas" : "text-ink-secondary"
                        )}
                      >
                        {format(day, "d")}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          newEvent(dayStr);
                        }}
                        title="Nuevo evento este día"
                        className="hidden h-5 w-5 items-center justify-center rounded-md text-ink-tertiary opacity-0 transition-opacity hover:bg-surface-active hover:text-ink group-hover:opacity-100 md:flex"
                      >
                        <Plus size={13} />
                      </button>
                    </div>

                    {/* chips (pantallas medianas+) */}
                    <div className="mt-1 hidden min-w-0 flex-col gap-1 md:flex">
                      {cards.slice(0, MAX_CHIPS).map((c) => (
                        <MonthChip
                          key={c.key}
                          card={c}
                          onOpen={(e) => {
                            e.stopPropagation();
                            if (c.task) openPeek({ kind: "task", id: c.task.id });
                            else if (c.event) openEvent(c.event);
                          }}
                        />
                      ))}
                      {cards.length > MAX_CHIPS && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            goDay(day);
                          }}
                          className="w-full rounded px-1 text-left text-2xs font-medium text-ink-tertiary transition-colors hover:text-accent"
                        >
                          +{cards.length - MAX_CHIPS} más
                        </button>
                      )}
                    </div>

                    {/* puntitos (teléfono) */}
                    {cards.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1 md:hidden">
                        {cards.slice(0, 4).map((c) => (
                          <span key={c.key} className="h-1.5 w-1.5 rounded-full" style={{ background: c.color }} />
                        ))}
                        {cards.length > 4 && <span className="text-[9px] leading-none text-ink-tertiary">+{cards.length - 4}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      <EventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        event={editing}
        defaultDate={defaultDate}
        projectId={projectId}
      />
    </div>
  );
}

/* chip compacto de la grilla mensual */
function MonthChip({ card, onOpen }: { card: Card; onOpen: (e: React.MouseEvent) => void }) {
  const time = card.timeLabel.match(/\d{2}:\d{2}/)?.[0] ?? "";
  return (
    <button
      onClick={onOpen}
      className={cn("flex w-full min-w-0 items-center gap-1 rounded-md px-1.5 py-[3px] text-left", card.done && "opacity-60")}
      style={{ background: `linear-gradient(100deg, ${tint(card.color, 0.5)} 0%, ${tint(card.color, 0.12)} 75%, transparent 100%)` }}
    >
      <span className={cn("min-w-0 flex-1 truncate text-[11px] font-medium leading-tight text-ink", card.done && "line-through")}>
        {card.title}
      </span>
      {time && <span className="shrink-0 text-[10px] tnum text-ink-tertiary">{time}</span>}
    </button>
  );
}
