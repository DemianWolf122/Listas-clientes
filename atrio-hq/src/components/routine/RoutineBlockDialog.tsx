"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useCreateRoutineBlock, useUpdateRoutineBlock, useDeleteRoutineBlock } from "@/hooks/routine";
import {
  AREA_ORDER,
  ROUTINE_AREAS,
  REPEAT_RULES,
  areaOf,
  offWindow,
  toMin,
  toHM,
  tint,
  type RepeatRule,
  type RoutineArea,
} from "@/lib/routine";
import { hm, cn } from "@/lib/utils";
import type { RoutineBlock } from "@/lib/types/database";

export function RoutineBlockDialog({
  open,
  onOpenChange,
  profileId,
  profileName,
  block,
  defaultDate,
  defaultStart,
  defaultArea,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profileId: string;
  profileName?: string;
  /** si viene, se edita; si no, se crea */
  block?: RoutineBlock | null;
  defaultDate?: string;
  defaultStart?: string;
  defaultArea?: RoutineArea;
}) {
  const create = useCreateRoutineBlock();
  const update = useUpdateRoutineBlock();
  const del = useDeleteRoutineBlock();

  const [area, setArea] = useState<RoutineArea>("deep");
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState("");
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("11:00");
  const [repeat, setRepeat] = useState<RepeatRule>("none");

  useEffect(() => {
    if (!open) return;
    if (block) {
      setArea(areaOf(block.area));
      setTitle(block.title);
      setCode(block.code ?? "");
      setNotes(block.notes ?? "");
      setDate(block.date);
      setStart(hm(block.start_time));
      setEnd(hm(block.end_time));
      setRepeat((block.repeat_rule as RepeatRule) ?? "none");
    } else {
      const s = defaultStart ?? "10:00";
      setArea(defaultArea ?? "deep");
      setTitle("");
      setCode("");
      setNotes("");
      setDate(defaultDate ?? "");
      setStart(s);
      setEnd(toHM(toMin(s) + 60));
      setRepeat("none");
    }
  }, [open, block, defaultDate, defaultStart, defaultArea]);

  const meta = ROUTINE_AREAS[area];
  const invalidRange = toMin(end) <= toMin(start);
  const warnWindow = !invalidRange && offWindow(area, toMin(start));

  async function save() {
    if (!title.trim() || !date || invalidRange) return;
    const payload = {
      profile_id: profileId,
      area,
      title: title.trim(),
      code: code.trim().toUpperCase() || null,
      notes: notes.trim() || null,
      date,
      start_time: start,
      end_time: end,
      repeat_rule: repeat,
    };
    if (block) {
      await update.mutateAsync({ id: block.id, ...payload });
      toast.success("Bloque actualizado");
    } else {
      await create.mutateAsync(payload);
      toast.success(`${meta.emoji} Bloque agendado`);
    }
    onOpenChange(false);
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={block ? "Editar bloque" : "Nuevo bloque de rutina"}
      description={profileName ? `Rutina de ${profileName}` : undefined}
    >
      <div className="mt-4 space-y-3">
        {/* área = sub-calendario */}
        <div className="flex flex-wrap gap-1.5">
          {AREA_ORDER.map((a) => {
            const m = ROUTINE_AREAS[a];
            const on = a === area;
            return (
              <button
                key={a}
                onClick={() => setArea(a)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[13px] font-medium transition-all",
                  on ? "border-transparent text-ink" : "border-hairline text-ink-secondary hover:bg-surface-hover"
                )}
                style={on ? { background: tint(m.color, 0.22), boxShadow: `inset 0 0 0 1px ${tint(m.color, 0.5)}` } : undefined}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.color }} />
                {m.label}
              </button>
            );
          })}
        </div>
        <p className="px-0.5 text-2xs text-ink-tertiary">{meta.hint}</p>

        <div className="flex gap-2">
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="¿Qué vas a hacer en este bloque?"
          />
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="SIGLA"
            aria-label="Sigla del proyecto"
            className="w-[92px] shrink-0 uppercase tnum"
            maxLength={8}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-hairline bg-canvas px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <div className="flex items-center gap-1.5">
            <input
              type="time"
              value={start}
              onChange={(e) => {
                const v = e.target.value;
                setStart(v);
                // el fin acompaña al inicio para no dejar rangos inválidos
                if (toMin(end) <= toMin(v)) setEnd(toHM(toMin(v) + 60));
              }}
              aria-label="Hora de inicio"
              className="rounded-lg border border-hairline bg-canvas px-2.5 py-2 text-sm outline-none focus:border-accent"
            />
            <span className="text-ink-tertiary">–</span>
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              aria-label="Hora de fin"
              className="rounded-lg border border-hairline bg-canvas px-2.5 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
        </div>

        {invalidRange && (
          <p className="text-2xs font-medium text-priority-urgent">La hora de fin tiene que ser posterior a la de inicio.</p>
        )}
        {warnWindow && meta.window && (
          <p className="text-2xs text-priority-high">
            Ojo: {meta.label.toLowerCase()} rinde entre {toHM(meta.window[0])} y {toHM(meta.window[1])}. Igual lo podés guardar.
          </p>
        )}

        <select
          value={repeat}
          onChange={(e) => setRepeat(e.target.value as RepeatRule)}
          className="w-full rounded-lg border border-hairline bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-accent"
        >
          {Object.entries(REPEAT_RULES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <Textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas (opcional)"
        />
      </div>

      <div className="mt-5 flex items-center justify-between">
        {block ? (
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              del.mutate(block.id);
              toast.success("Bloque eliminado");
              onOpenChange(false);
            }}
          >
            <Trash2 size={14} /> Eliminar
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={save} disabled={!title.trim() || !date || invalidRange}>
            Guardar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
