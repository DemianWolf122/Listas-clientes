"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format, addDays, startOfWeek, isSameDay, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, LayoutGrid, List, Plus, Check, Layers } from "lucide-react";
import { useProfiles } from "@/hooks/profiles";
import { useIdentity } from "@/stores/identity";
import { usePrefs } from "@/stores/ui";
import { useRoutineBlocks, useUpdateRoutineBlock } from "@/hooks/routine";
import { useAllTasks } from "@/hooks/tasks";
import { useEvents } from "@/hooks/events";
import { Segmented } from "@/components/ui/Segmented";
import { EmptyState } from "@/components/ui/EmptyState";
import { RoutineBlockDialog } from "./RoutineBlockDialog";
import {
  AREA_ORDER,
  ROUTINE_AREAS,
  FOCUS_WINDOW,
  areaOf,
  occursOn,
  layoutColumns,
  fitRange,
  toMin,
  toHM,
  tint,
  durationLabel,
  suggestArea,
  type RoutineArea,
} from "@/lib/routine";
import { timeOfDay, readableText, cn } from "@/lib/utils";
import type { RoutineBlock } from "@/lib/types/database";

/** alto de una hora en px */
const HOUR_H = 56;
const GUTTER = 52;
const ymd = (d: Date) => format(d, "yyyy-MM-dd");

type GridItem = {
  key: string;
  kind: "block" | "task" | "event";
  startMin: number;
  endMin: number;
  color: string;
  /** sigla del área + del proyecto: "DW | ESC" */
  label: string;
  title: string;
  done: boolean;
  block?: RoutineBlock;
};

export function RoutineView() {
  const me = useIdentity((s) => s.profileId);
  const { data: profiles } = useProfiles();
  const {
    routineHidden,
    toggleRoutineArea,
    showAllRoutineAreas,
    routineShowAgenda,
    toggleRoutineShowAgenda,
  } = usePrefs();

  const [whoId, setWhoId] = useState<string | null>(null);
  const profileId = whoId ?? me;
  const profile = (profiles ?? []).find((p) => p.id === profileId) ?? null;

  const { data: blocks, isLoading } = useRoutineBlocks(profileId);
  const { data: tasks } = useAllTasks();
  const { data: events } = useEvents();
  const updateBlock = useUpdateRoutineBlock();

  const [view, setView] = useState<"day" | "week">("day");
  const [date, setDate] = useState<Date>(() => new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RoutineBlock | null>(null);
  const [draft, setDraft] = useState<{ date: string; start: string; area: RoutineArea } | null>(null);

  const hidden = useMemo(() => new Set(routineHidden[profileId ?? ""] ?? []), [routineHidden, profileId]);

  const days = useMemo(() => {
    if (view === "day") return [date];
    const start = startOfWeek(date, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [view, date]);

  /** Bloques de rutina + (opcional) tareas con horario y eventos, por día. */
  const itemsByDay = useMemo(() => {
    const map: Record<string, GridItem[]> = {};
    for (const day of days) {
      const dayStr = ymd(day);
      const items: GridItem[] = [];

      for (const b of blocks ?? []) {
        const area = areaOf(b.area);
        if (hidden.has(area)) continue;
        if (!occursOn(b, dayStr)) continue;
        const meta = ROUTINE_AREAS[area];
        items.push({
          key: `b-${b.id}-${dayStr}`,
          kind: "block",
          startMin: toMin(b.start_time),
          endMin: toMin(b.end_time),
          color: meta.color,
          label: [meta.short, b.code].filter(Boolean).join(" | "),
          title: b.title,
          done: b.done,
          block: b,
        });
      }

      if (routineShowAgenda) {
        for (const t of tasks ?? []) {
          if (t.assignee_id !== profileId) continue;
          if (t.start_date !== dayStr || !t.start_time) continue;
          const startMin = toMin(t.start_time);
          const endMin = t.end_time ? toMin(t.end_time) : startMin + 30;
          items.push({
            key: `t-${t.id}-${dayStr}`,
            kind: "task",
            startMin,
            endMin: Math.max(endMin, startMin + 15),
            color: t.project?.color ?? "#9B9B98",
            label: "TAREA",
            title: t.title,
            done: t.status === "done",
          });
        }
        for (const e of events ?? []) {
          if (e.all_day) continue;
          if (format(parseISO(e.starts_at), "yyyy-MM-dd") !== dayStr) continue;
          const startMin = toMin(timeOfDay(e.starts_at));
          const endMin = e.ends_at ? toMin(timeOfDay(e.ends_at)) : startMin + 60;
          items.push({
            key: `e-${e.id}-${dayStr}`,
            kind: "event",
            startMin,
            endMin: Math.max(endMin, startMin + 15),
            color: e.color ?? "#8E7CC3",
            label: "EVENTO",
            title: e.title,
            done: false,
          });
        }
      }
      map[dayStr] = items;
    }
    return map;
  }, [days, blocks, hidden, routineShowAgenda, tasks, events, profileId]);

  const allItems = useMemo(() => Object.values(itemsByDay).flat(), [itemsByDay]);
  const [fromH, toH] = useMemo(() => fitRange(allItems), [allItems]);

  /** Horas por área en el rango visible: el balance real de la semana/día. */
  const totals = useMemo(() => {
    const acc: Partial<Record<RoutineArea, number>> = {};
    for (const day of days) {
      for (const b of blocks ?? []) {
        const area = areaOf(b.area);
        if (hidden.has(area) || !occursOn(b, ymd(day))) continue;
        acc[area] = (acc[area] ?? 0) + (toMin(b.end_time) - toMin(b.start_time));
      }
    }
    return acc;
  }, [days, blocks, hidden]);
  const totalMin = Object.values(totals).reduce((a, b) => a + b, 0);

  function newBlock(dayStr: string, start: string) {
    setEditing(null);
    setDraft({ date: dayStr, start, area: suggestArea(toMin(start)) });
    setDialogOpen(true);
  }
  function openBlock(b: RoutineBlock) {
    setEditing(b);
    setDraft(null);
    setDialogOpen(true);
  }

  const rangeLabel =
    view === "day"
      ? format(date, "EEEE d 'de' MMMM", { locale: es })
      : `${format(days[0], "d")} – ${format(days[6], "d 'de' MMMM", { locale: es })}`;

  return (
    <div className="flex h-full flex-col">
      {/* ---------- header ---------- */}
      <div className="flex flex-wrap items-center gap-2 border-b border-hairline px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-1">
          <button
            className="icon-btn"
            onClick={() => setDate(addDays(date, view === "week" ? -7 : -1))}
            aria-label="Anterior"
          >
            <ChevronLeft size={17} />
          </button>
          <button
            className="icon-btn"
            onClick={() => setDate(addDays(date, view === "week" ? 7 : 1))}
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
        <div className="min-w-0 text-[15px] font-semibold text-ink first-letter:uppercase">{rangeLabel}</div>
        <div className="flex-1" />
        {(profiles ?? []).length > 1 && (
          <Segmented
            value={profileId ?? ""}
            onChange={(v) => setWhoId(v)}
            options={(profiles ?? []).map((p) => ({
              value: p.id,
              label: p.id === me ? "Mi rutina" : p.name,
              icon: <span>{p.emoji ?? "🙂"}</span>,
            }))}
          />
        )}
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: "day", label: "Día", icon: <List size={14} /> },
            { value: "week", label: "Semana", icon: <LayoutGrid size={14} /> },
          ]}
        />
        <button
          onClick={() => newBlock(ymd(date), "10:00")}
          className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-2.5 py-1.5 text-[13px] font-medium text-canvas transition hover:opacity-90"
        >
          <Plus size={14} /> Bloque
        </button>
      </div>

      {/* ---------- sub-calendarios ---------- */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-hairline bg-surface/40 px-4 py-2 sm:px-6">
        <button
          onClick={() => profileId && showAllRoutineAreas(profileId)}
          className={cn(
            "rounded-lg border px-2.5 py-1 text-2xs font-semibold uppercase tracking-wide transition-colors",
            hidden.size === 0
              ? "border-transparent bg-ink text-canvas"
              : "border-hairline text-ink-secondary hover:bg-surface-hover"
          )}
          title="Ver los cinco sub-calendarios juntos"
        >
          <Layers size={11} className="mr-1 inline" />
          Todos
        </button>
        {AREA_ORDER.map((a) => {
          const meta = ROUTINE_AREAS[a];
          const on = !hidden.has(a);
          const mins = totals[a] ?? 0;
          return (
            <button
              key={a}
              onClick={() => profileId && toggleRoutineArea(profileId, a)}
              title={meta.hint}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[13px] font-medium transition-all",
                on ? "border-transparent text-ink" : "border-hairline text-ink-tertiary hover:bg-surface-hover"
              )}
              style={on ? { background: tint(meta.color, 0.18), boxShadow: `inset 0 0 0 1px ${tint(meta.color, 0.45)}` } : undefined}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full transition-opacity"
                style={{ background: meta.color, opacity: on ? 1 : 0.35 }}
              />
              <span className="hidden sm:inline">{meta.label}</span>
              <span className="sm:hidden">{meta.short}</span>
              {on && mins > 0 && <span className="tnum text-2xs text-ink-secondary">{durationLabel(0, mins)}</span>}
            </button>
          );
        })}
        <div className="flex-1" />
        {totalMin > 0 && (
          <span className="hidden text-2xs text-ink-tertiary sm:inline">
            {durationLabel(0, totalMin)} agendadas
          </span>
        )}
        <button
          onClick={toggleRoutineShowAgenda}
          className={cn(
            "rounded-lg border px-2.5 py-1 text-2xs font-medium transition-colors",
            routineShowAgenda
              ? "border-hairline-strong bg-canvas text-ink"
              : "border-hairline text-ink-tertiary hover:bg-surface-hover"
          )}
          title="Superponer las tareas con horario y los eventos del equipo"
        >
          + Agenda
        </button>
      </div>

      {/* ---------- grilla ---------- */}
      {isLoading ? (
        <div className="flex-1" />
      ) : allItems.length === 0 && (blocks ?? []).length === 0 ? (
        <EmptyState
          emoji="🗓️"
          title={`${profile?.name ?? "Esta"} todavía no armó su rutina`}
          hint="Tocá cualquier franja de la grilla para crear el primer bloque. El trabajo profundo va de 10 a 14, las reuniones a la tarde."
          className="mt-14"
          action={
            <button
              onClick={() => newBlock(ymd(date), "10:00")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-[13px] font-medium text-accent-fg transition hover:opacity-90"
            >
              <Plus size={15} /> Nuevo bloque
            </button>
          }
        />
      ) : (
        <TimeGrid
          days={days}
          itemsByDay={itemsByDay}
          fromH={fromH}
          toH={toH}
          onSlot={newBlock}
          onOpen={openBlock}
          onToggleDone={(b) => updateBlock.mutate({ id: b.id, done: !b.done })}
          onDayClick={(d) => {
            setDate(d);
            setView("day");
          }}
        />
      )}

      {profileId && (
        <RoutineBlockDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          profileId={profileId}
          profileName={profile?.name}
          block={editing}
          defaultDate={draft?.date}
          defaultStart={draft?.start}
          defaultArea={draft?.area}
        />
      )}
    </div>
  );
}

/* ------------------------------ grilla ------------------------------ */

function TimeGrid({
  days,
  itemsByDay,
  fromH,
  toH,
  onSlot,
  onOpen,
  onToggleDone,
  onDayClick,
}: {
  days: Date[];
  itemsByDay: Record<string, GridItem[]>;
  fromH: number;
  toH: number;
  onSlot: (dayStr: string, start: string) => void;
  onOpen: (b: RoutineBlock) => void;
  onToggleDone: (b: RoutineBlock) => void;
  onDayClick: (d: Date) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const hours = Array.from({ length: toH - fromH }, (_, i) => fromH + i);
  const height = hours.length * HOUR_H;
  const week = days.length > 1;

  const [nowMin, setNowMin] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });
  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setNowMin(d.getHours() * 60 + d.getMinutes());
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  // arrancar mirando dónde estás parado (o la franja de foco), no la madrugada
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const hoyALaVista = days.some((d) => isSameDay(d, new Date()));
    const ancla = hoyALaVista ? Math.max(nowMin, FOCUS_WINDOW[0]) : FOCUS_WINDOW[0];
    el.scrollTo({ top: Math.max(0, ((ancla - 60) / 60 - fromH) * HOUR_H) });
    // solo al montar / cambiar de rango, no en cada minuto
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromH, toH, days.length]);

  const topOf = (min: number) => ((min - fromH * 60) / 60) * HOUR_H;

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
      <div className={cn("relative", week && "min-w-[820px]")}>
        {/* encabezado de días (solo semana) */}
        {week && (
          <div className="sticky top-0 z-20 flex border-b border-hairline bg-canvas/95 backdrop-blur">
            <div className="shrink-0" style={{ width: GUTTER }} />
            {days.map((d) => {
              const today = isSameDay(d, new Date());
              return (
                <button
                  key={ymd(d)}
                  onClick={() => onDayClick(d)}
                  className="flex-1 border-l border-hairline py-1.5 text-center transition-colors hover:bg-surface-hover"
                >
                  <div className={cn("text-2xs font-semibold uppercase tracking-wide", today ? "text-accent" : "text-ink-tertiary")}>
                    {format(d, "EEE", { locale: es })}
                  </div>
                  <div
                    className={cn(
                      "mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-[13px] font-semibold tnum",
                      today ? "bg-accent text-accent-fg" : "text-ink"
                    )}
                  >
                    {format(d, "d")}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex">
          {/* regla de horas */}
          <div className="relative shrink-0" style={{ width: GUTTER, height }}>
            {hours.map((h, i) => (
              <div
                key={h}
                className="absolute right-1.5 -translate-y-1/2 text-2xs tnum text-ink-tertiary"
                style={{ top: i * HOUR_H }}
              >
                {i === 0 ? "" : `${String(h).padStart(2, "0")}:00`}
              </div>
            ))}
          </div>

          {days.map((d, dayIdx) => {
            const dayStr = ymd(d);
            const today = isSameDay(d, new Date());
            const positioned = layoutColumns(itemsByDay[dayStr] ?? []);
            const focusTop = topOf(Math.max(FOCUS_WINDOW[0], fromH * 60));
            const focusH = ((Math.min(FOCUS_WINDOW[1], toH * 60) - Math.max(FOCUS_WINDOW[0], fromH * 60)) / 60) * HOUR_H;
            return (
              <div
                key={dayStr}
                className="relative flex-1 border-l border-hairline"
                style={{ height }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const y = e.clientY - rect.top;
                  const raw = fromH * 60 + (y / HOUR_H) * 60;
                  onSlot(dayStr, toHM(Math.floor(raw / 30) * 30));
                }}
              >
                {/* franja de foco 10–14 */}
                {focusH > 0 && (
                  <div
                    className="pointer-events-none absolute inset-x-0"
                    style={{ top: focusTop, height: focusH, background: tint(ROUTINE_AREAS.deep.color, 0.06) }}
                  >
                    {dayIdx === 0 && (
                      <span className="absolute left-1 top-1 text-[9px] font-semibold uppercase tracking-wide text-ink-tertiary/70">
                        franja de foco
                      </span>
                    )}
                  </div>
                )}

                {/* líneas de hora */}
                {hours.map((h, i) => (
                  <div
                    key={h}
                    className="pointer-events-none absolute inset-x-0 border-t border-hairline"
                    style={{ top: i * HOUR_H }}
                  />
                ))}

                {/* línea de ahora */}
                {today && nowMin >= fromH * 60 && nowMin <= toH * 60 && (
                  <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: topOf(nowMin) }}>
                    <span className="-ml-1 h-2 w-2 rounded-full bg-[#E5624F]" />
                    <div className="h-px flex-1 bg-[#E5624F]" />
                  </div>
                )}

                {/* bloques */}
                {positioned.map(({ item, col, cols }) => (
                  <BlockCard
                    key={item.key}
                    item={item}
                    top={topOf(item.startMin)}
                    height={Math.max(18, ((item.endMin - item.startMin) / 60) * HOUR_H - 2)}
                    col={col}
                    cols={cols}
                    onOpen={onOpen}
                    onToggleDone={onToggleDone}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BlockCard({
  item,
  top,
  height,
  col,
  cols,
  onOpen,
  onToggleDone,
}: {
  item: GridItem;
  top: number;
  height: number;
  col: number;
  cols: number;
  onOpen: (b: RoutineBlock) => void;
  onToggleDone: (b: RoutineBlock) => void;
}) {
  const overlay = item.kind !== "block";
  const compact = height < 40;
  const style: React.CSSProperties = {
    top,
    height,
    left: `calc(${(col / cols) * 100}% + 2px)`,
    width: `calc(${100 / cols}% - 4px)`,
    ...(overlay
      ? {
          background: tint(item.color, 0.14),
          border: `1px dashed ${tint(item.color, 0.55)}`,
        }
      : {
          background: item.color,
          color: readableText(item.color),
        }),
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        if (item.block) onOpen(item.block);
      }}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && item.block) {
          e.preventDefault();
          onOpen(item.block);
        }
      }}
      className={cn(
        "group absolute overflow-hidden rounded-md px-1.5 py-1 text-left leading-tight transition-shadow",
        !overlay && "shadow-card hover:shadow-subtle",
        overlay && "text-ink-secondary",
        item.done && "opacity-55",
        item.block ? "cursor-pointer" : "cursor-default"
      )}
      style={style}
    >
      <div className="flex items-start gap-1">
        <div className="min-w-0 flex-1">
          <div className={cn("truncate text-[11px] font-semibold", item.done && "line-through")}>
            {item.label ? `${item.label} · ` : ""}
            {item.title}
          </div>
          {!compact && (
            <div className="mt-0.5 truncate text-[10px] tnum opacity-80">
              {toHM(item.startMin)}–{toHM(item.endMin)}
            </div>
          )}
        </div>
        {item.block && height >= 34 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleDone(item.block!);
            }}
            aria-label={item.done ? "Marcar como pendiente" : "Marcar como hecho"}
            className={cn(
              "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-opacity",
              item.done ? "border-current opacity-90" : "border-current/50 opacity-0 group-hover:opacity-100"
            )}
          >
            {item.done && <Check size={10} strokeWidth={3} />}
          </button>
        )}
      </div>
    </div>
  );
}
