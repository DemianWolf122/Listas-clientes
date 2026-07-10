"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Check,
  Flag,
  CalendarDays,
  CalendarClock,
  CalendarRange,
  Clock,
  UserCircle2,
  Tag as TagIcon,
  Plus,
  X,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { Avatar } from "@/components/ui/Avatar";
import { useProfiles } from "@/hooks/profiles";
import { useTags, useCreateTag, useToggleTaskTag } from "@/hooks/tags";
import { PRIORITY, PRIORITY_ORDER, type Priority } from "@/lib/constants";
import { cn, humanDate, isOverdue, readableText, hm } from "@/lib/utils";

const timeInputCls =
  "rounded-md border border-hairline bg-canvas px-2 py-1 text-[13px] outline-none focus:border-accent tnum";
import type { Tag } from "@/lib/types/database";

function Row({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-ink transition-colors hover:bg-surface-hover",
        active && "bg-surface-hover"
      )}
    >
      {children}
    </button>
  );
}

/* ---------------- Status checkbox (circular, Notion/Asana style) ---------------- */
export function StatusCheckbox({
  checked,
  onToggle,
  size = 18,
}: {
  checked: boolean;
  onToggle: () => void;
  size?: number;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border transition-all duration-150",
        checked
          ? "border-transparent bg-priority-medium text-white"
          : "border-hairline-strong text-transparent hover:border-priority-medium hover:text-priority-medium/40"
      )}
      style={{ width: size, height: size, background: checked ? "#4FA373" : undefined, borderColor: checked ? "#4FA373" : undefined }}
      aria-label={checked ? "Marcar como pendiente" : "Completar"}
    >
      <Check size={size * 0.62} strokeWidth={3} />
    </button>
  );
}

/* ---------------- Priority ---------------- */
export function PriorityDot({ value }: { value: string }) {
  const p = PRIORITY[value as Priority] ?? PRIORITY.none;
  if (value === "none") return null;
  return <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.color }} title={p.label} />;
}

export function PriorityControl({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: Priority) => void;
}) {
  const [open, setOpen] = useState(false);
  const p = PRIORITY[value as Priority] ?? PRIORITY.none;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[13px] text-ink transition-colors hover:bg-surface-hover">
          <Flag size={14} style={{ color: value === "none" ? undefined : p.color }} className={value === "none" ? "text-ink-tertiary" : ""} />
          <span className={value === "none" ? "text-ink-secondary" : ""}>{p.label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[180px]">
        {PRIORITY_ORDER.map((k) => (
          <Row key={k} active={value === k} onClick={() => { onChange(k); setOpen(false); }}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: PRIORITY[k].color }} />
            <span className="flex-1">{PRIORITY[k].label}</span>
            {value === k && <Check size={14} className="text-ink-secondary" />}
          </Row>
        ))}
      </PopoverContent>
    </Popover>
  );
}

/* ---------------- Assignee ---------------- */
export function AssigneeControl({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: profiles } = useProfiles();
  const assignee = profiles?.find((p) => p.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[13px] text-ink transition-colors hover:bg-surface-hover">
          {assignee ? (
            <>
              <Avatar profile={assignee} size={20} />
              <span>{assignee.name}</span>
            </>
          ) : (
            <>
              <UserCircle2 size={18} className="text-ink-tertiary" />
              <span className="text-ink-secondary">Sin asignar</span>
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px]">
        <Row active={!value} onClick={() => { onChange(null); setOpen(false); }}>
          <UserCircle2 size={18} className="text-ink-tertiary" />
          <span className="flex-1">Sin asignar</span>
        </Row>
        {profiles?.map((p) => (
          <Row key={p.id} active={value === p.id} onClick={() => { onChange(p.id); setOpen(false); }}>
            <Avatar profile={p} size={20} />
            <span className="flex-1">{p.name}</span>
            {value === p.id && <Check size={14} className="text-ink-secondary" />}
          </Row>
        ))}
      </PopoverContent>
    </Popover>
  );
}

/* ---------------- Due date ---------------- */
export function DueChip({
  value,
  status,
  time,
}: {
  value: string | null;
  status?: string;
  time?: string | null;
}) {
  if (!value) return null;
  const overdue = isOverdue(value, status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-2xs font-medium tnum",
        overdue ? "bg-priority-urgent/10 text-priority-urgent" : "bg-surface text-ink-secondary"
      )}
    >
      <CalendarDays size={11} />
      {humanDate(value)}
      {time && <span className="opacity-80">· {hm(time)}</span>}
    </span>
  );
}

/** Chip del bloque agendado (para tarjetas / filas). */
export function ScheduleChip({ date, start, end }: { date: string | null; start: string | null; end: string | null }) {
  if (!date || !start) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-accent-soft px-1.5 py-0.5 text-2xs font-medium text-accent tnum">
      <Clock size={11} />
      {hm(start)}
      {end && `–${hm(end)}`}
    </span>
  );
}

export function DueDateControl({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const today = new Date();
  const set = (d: Date | null) => {
    onChange(d ? format(d, "yyyy-MM-dd") : null);
    setOpen(false);
  };
  const plus = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d;
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[13px] transition-colors hover:bg-surface-hover">
          <CalendarDays size={14} className="text-ink-tertiary" />
          <span className={value ? "text-ink" : "text-ink-secondary"}>
            {value ? humanDate(value) : "Sin fecha"}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-2">
        <div className="grid grid-cols-2 gap-1">
          <Quick label="Hoy" onClick={() => set(today)} />
          <Quick label="Mañana" onClick={() => set(plus(1))} />
          <Quick label="En 3 días" onClick={() => set(plus(3))} />
          <Quick label="En 1 semana" onClick={() => set(plus(7))} />
        </div>
        <input
          type="date"
          value={value ?? ""}
          onChange={(e) => set(e.target.value ? new Date(e.target.value + "T00:00:00") : null)}
          className="mt-2 w-full rounded-md border border-hairline bg-canvas px-2 py-1.5 text-[13px] outline-none focus:border-accent"
        />
        {value && (
          <button
            onClick={() => set(null)}
            className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-md py-1.5 text-2xs text-priority-urgent transition-colors hover:bg-priority-urgent/10"
          >
            <X size={12} /> Quitar fecha
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function Quick({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-md bg-surface px-2 py-1.5 text-2xs font-medium text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink"
    >
      {label}
    </button>
  );
}

function plusDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

/** Entrega: fecha + hora límite. */
export function DeadlineControl({
  date,
  time,
  onChange,
}: {
  date: string | null;
  time: string | null;
  onChange: (v: { date: string | null; time: string | null }) => void;
}) {
  const [open, setOpen] = useState(false);
  const setDate = (d: Date) => onChange({ date: format(d, "yyyy-MM-dd"), time });
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[13px] transition-colors hover:bg-surface-hover">
          <CalendarClock size={14} className="text-ink-tertiary" />
          <span className={date ? "text-ink" : "text-ink-secondary"}>
            {date ? `${humanDate(date)}${time ? ` · ${hm(time)}` : ""}` : "Sin fecha"}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-2">
        <div className="grid grid-cols-2 gap-1">
          <Quick label="Hoy" onClick={() => setDate(new Date())} />
          <Quick label="Mañana" onClick={() => setDate(plusDays(1))} />
          <Quick label="En 3 días" onClick={() => setDate(plusDays(3))} />
          <Quick label="En 1 semana" onClick={() => setDate(plusDays(7))} />
        </div>
        <input
          type="date"
          value={date ?? ""}
          onChange={(e) => onChange({ date: e.target.value || null, time: e.target.value ? time : null })}
          className={cn(timeInputCls, "mt-2 w-full")}
        />
        {date && (
          <div className="mt-1.5 flex items-center gap-2">
            <Clock size={14} className="text-ink-tertiary" />
            <input
              type="time"
              value={hm(time)}
              onChange={(e) => onChange({ date, time: e.target.value || null })}
              className={cn(timeInputCls, "flex-1")}
            />
            {time && (
              <button onClick={() => onChange({ date, time: null })} className="icon-btn h-7 w-7">
                <X size={13} />
              </button>
            )}
          </div>
        )}
        {date && (
          <button
            onClick={() => {
              onChange({ date: null, time: null });
              setOpen(false);
            }}
            className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-md py-1.5 text-2xs text-priority-urgent transition-colors hover:bg-priority-urgent/10"
          >
            <X size={12} /> Quitar fecha
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Agenda: bloque de trabajo (fecha + de tal hora a tal hora). */
export function ScheduleControl({
  date,
  start,
  end,
  onChange,
}: {
  date: string | null;
  start: string | null;
  end: string | null;
  onChange: (v: { date: string | null; start: string | null; end: string | null }) => void;
}) {
  const [open, setOpen] = useState(false);
  const label = date
    ? start
      ? `${humanDate(date)} · ${hm(start)}${end ? `–${hm(end)}` : ""}`
      : humanDate(date)
    : "Sin agendar";
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[13px] transition-colors hover:bg-surface-hover">
          <CalendarRange size={14} className="text-ink-tertiary" />
          <span className={date ? "text-ink" : "text-ink-secondary"}>{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[256px] p-2">
        <div className="grid grid-cols-2 gap-1">
          <Quick label="Hoy" onClick={() => onChange({ date: format(new Date(), "yyyy-MM-dd"), start, end })} />
          <Quick label="Mañana" onClick={() => onChange({ date: format(plusDays(1), "yyyy-MM-dd"), start, end })} />
        </div>
        <input
          type="date"
          value={date ?? ""}
          onChange={(e) => onChange({ date: e.target.value || null, start, end })}
          className={cn(timeInputCls, "mt-2 w-full")}
        />
        <div className="mt-1.5 flex items-center gap-1.5">
          <Clock size={14} className="shrink-0 text-ink-tertiary" />
          <input
            type="time"
            value={hm(start)}
            onChange={(e) => onChange({ date, start: e.target.value || null, end })}
            className={cn(timeInputCls, "min-w-0 flex-1")}
          />
          <span className="text-ink-tertiary">–</span>
          <input
            type="time"
            value={hm(end)}
            onChange={(e) => onChange({ date, start, end: e.target.value || null })}
            className={cn(timeInputCls, "min-w-0 flex-1")}
          />
        </div>
        {date && (
          <button
            onClick={() => {
              onChange({ date: null, start: null, end: null });
              setOpen(false);
            }}
            className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-md py-1.5 text-2xs text-priority-urgent transition-colors hover:bg-priority-urgent/10"
          >
            <X size={12} /> Quitar del día
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

/* ---------------- Tags ---------------- */
export function TagChips({ tags, onRemove }: { tags: Tag[]; onRemove?: (id: string) => void }) {
  if (!tags.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((t) => (
        <span
          key={t.id}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-2xs font-medium"
          style={{ background: t.color, color: readableText(t.color) }}
        >
          {t.name}
          {onRemove && (
            <button onClick={() => onRemove(t.id)} className="opacity-60 hover:opacity-100">
              <X size={10} />
            </button>
          )}
        </span>
      ))}
    </div>
  );
}

export function TagControl({ taskId, current }: { taskId: string; current: Tag[] }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const { data: tags } = useTags();
  const createTag = useCreateTag();
  const toggle = useToggleTaskTag();
  const currentIds = new Set(current.map((t) => t.id));

  async function createAndAdd() {
    const name = draft.trim();
    if (!name) return;
    const tag = await createTag.mutateAsync(name);
    toggle.mutate({ taskId, tagId: tag.id, on: true });
    setDraft("");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[13px] text-ink-secondary transition-colors hover:bg-surface-hover">
          <TagIcon size={14} className="text-ink-tertiary" />
          Etiquetas
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createAndAdd()}
          placeholder="Buscar o crear…"
          className="mb-1.5 w-full rounded-md border border-hairline bg-canvas px-2 py-1.5 text-[13px] outline-none focus:border-accent"
        />
        <div className="max-h-[200px] space-y-px overflow-y-auto">
          {(tags ?? [])
            .filter((t) => t.name.toLowerCase().includes(draft.toLowerCase()))
            .map((t) => (
              <Row
                key={t.id}
                onClick={() => toggle.mutate({ taskId, tagId: t.id, on: !currentIds.has(t.id) })}
              >
                <span className="h-3 w-3 rounded" style={{ background: t.color }} />
                <span className="flex-1">{t.name}</span>
                {currentIds.has(t.id) && <Check size={14} className="text-ink-secondary" />}
              </Row>
            ))}
          {draft.trim() && !tags?.some((t) => t.name.toLowerCase() === draft.trim().toLowerCase()) && (
            <Row onClick={createAndAdd}>
              <Plus size={14} className="text-ink-tertiary" />
              <span>Crear “{draft.trim()}”</span>
            </Row>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
