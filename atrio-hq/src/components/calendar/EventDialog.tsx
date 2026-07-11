"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useCreateEvent, useUpdateEvent, useDeleteEvent } from "@/hooks/events";
import { PASTELS } from "@/lib/constants";
import type { CalEvent } from "@/lib/types/database";

export function EventDialog({
  open,
  onOpenChange,
  event,
  defaultDate,
  defaultTime,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  event?: CalEvent | null;
  defaultDate?: string;
  defaultTime?: string;
}) {
  const create = useCreateEvent();
  const update = useUpdateEvent();
  const del = useDeleteEvent();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [endTime, setEndTime] = useState(""); // "" = sin hora de fin
  const [allDay, setAllDay] = useState(false);
  const [color, setColor] = useState<string>(PASTELS[4]);

  useEffect(() => {
    if (open) {
      if (event) {
        const d = new Date(event.starts_at);
        setTitle(event.title);
        setDescription(event.description ?? "");
        // Formateamos en la zona local del dispositivo (los dos estamos en Buenos Aires),
        // para que la hora que se ve al editar sea la misma que se cargó.
        setDate(format(d, "yyyy-MM-dd"));
        setTime(format(d, "HH:mm"));
        setEndTime(event.ends_at ? format(new Date(event.ends_at), "HH:mm") : "");
        setAllDay(event.all_day);
        setColor(event.color ?? PASTELS[4]);
      } else {
        setTitle("");
        setDescription("");
        setDate(defaultDate ?? format(new Date(), "yyyy-MM-dd"));
        setTime(defaultTime ?? "10:00");
        setEndTime("");
        setAllDay(false);
        setColor(PASTELS[4]);
      }
    }
  }, [open, event, defaultDate, defaultTime]);

  async function save() {
    if (!title.trim() || !date) return;
    // Construimos el instante a partir de la hora de pared local: `new Date("...T10:00:00")`
    // se interpreta en la zona del dispositivo y `.toISOString()` lo guarda en UTC correctamente,
    // así 10:00 en Buenos Aires se guarda como 13:00Z y se vuelve a mostrar como 10:00.
    const startDt = new Date(`${date}T${allDay ? "00:00" : time}:00`);
    const starts_at = startDt.toISOString();
    let ends_at: string | null = null;
    if (!allDay && endTime) {
      const endDt = new Date(`${date}T${endTime}:00`);
      if (endDt > startDt) ends_at = endDt.toISOString();
    }
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      starts_at,
      ends_at,
      all_day: allDay,
      color,
    };
    if (event) {
      await update.mutateAsync({ id: event.id, ...payload });
      toast.success("Evento actualizado");
    } else {
      await create.mutateAsync({ ...payload, project_id: null });
      toast.success("Evento creado 📅");
    }
    onOpenChange(false);
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={event ? "Editar evento" : "Nuevo evento"}>
      <div className="mt-4 space-y-3">
        <Input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="Título del evento"
        />
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción (opcional)"
        />
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-hairline bg-canvas px-3 py-2 text-sm outline-none focus:border-accent"
          />
          {!allDay && (
            <div className="flex items-center gap-1.5">
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="rounded-lg border border-hairline bg-canvas px-2.5 py-2 text-sm outline-none focus:border-accent"
              />
              <span className="text-ink-tertiary">–</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                aria-label="Hora de fin (opcional)"
                className="rounded-lg border border-hairline bg-canvas px-2.5 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
          )}
        </div>
        <label className="flex items-center gap-2 text-[13px] text-ink-secondary">
          <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
          Todo el día
        </label>
        <div className="flex items-center gap-1.5">
          {PASTELS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="h-6 w-6 rounded-full"
              style={{ background: c, boxShadow: color === c ? "0 0 0 2px rgb(var(--accent))" : undefined }}
            />
          ))}
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between">
        {event ? (
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              del.mutate(event.id);
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
          <Button variant="primary" onClick={save} disabled={!title.trim()}>
            Guardar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
