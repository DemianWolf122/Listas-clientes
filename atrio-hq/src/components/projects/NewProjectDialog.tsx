"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmojiPicker } from "@/components/ui/EmojiPicker";
import { useCreateProject } from "@/hooks/projects";
import { PASTELS } from "@/lib/constants";

export function NewProjectDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const create = useCreateProject();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("📁");
  const [client, setClient] = useState("");
  const [color, setColor] = useState<string>(PASTELS[4]);

  async function submit() {
    if (!name.trim()) return;
    const project = await create.mutateAsync({
      name: name.trim(),
      emoji,
      client_name: client.trim() || null,
      color,
    });
    toast.success("Proyecto creado ✨");
    onOpenChange(false);
    setName("");
    setClient("");
    router.push(`/proyectos/${project.id}`);
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Nuevo proyecto">
      <div className="mt-4 space-y-3">
        <div className="flex items-center gap-2">
          <EmojiPicker onSelect={setEmoji}>
            <button className="flex h-11 w-11 items-center justify-center rounded-lg border border-hairline bg-surface text-2xl transition-colors hover:bg-surface-hover">
              {emoji}
            </button>
          </EmojiPicker>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Nombre del proyecto"
          />
        </div>
        <Input
          value={client}
          onChange={(e) => setClient(e.target.value)}
          placeholder="Cliente (opcional)"
        />
        <div className="flex items-center gap-1.5">
          {PASTELS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="h-6 w-6 rounded-full ring-offset-2 ring-offset-canvas transition-all"
              style={{ background: c, boxShadow: color === c ? `0 0 0 2px rgb(var(--accent))` : undefined }}
            />
          ))}
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={submit} disabled={!name.trim() || create.isPending}>
          Crear proyecto
        </Button>
      </div>
    </Modal>
  );
}
