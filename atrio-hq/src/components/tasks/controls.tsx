"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Check, Flag, CalendarDays, UserCircle2, Tag as TagIcon, Plus, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { Avatar } from "@/components/ui/Avatar";
import { useProfiles } from "@/hooks/profiles";
import { useTags, useCreateTag, useToggleTaskTag } from "@/hooks/tags";
import { PRIORITY, PRIORITY_ORDER, type Priority } from "@/lib/constants";
import { cn, humanDate, isOverdue, readableText } from "@/lib/utils";
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
export function DueChip({ value, status }: { value: string | null; status?: string }) {
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
