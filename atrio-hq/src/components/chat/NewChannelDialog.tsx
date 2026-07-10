"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmojiPicker } from "@/components/ui/EmojiPicker";
import { useCreateChannel } from "@/hooks/chat";

export function NewChannelDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const create = useCreateChannel();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("💬");

  async function submit() {
    if (!name.trim()) return;
    const ch = await create.mutateAsync({ name: name.trim().replace(/^#/, ""), emoji, kind: "channel" });
    toast.success("Canal creado 💬");
    onOpenChange(false);
    setName("");
    router.push(`/chat/${ch.id}`);
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Nuevo canal">
      <div className="mt-4 flex items-center gap-2">
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
          placeholder="nombre-del-canal"
        />
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={submit} disabled={!name.trim() || create.isPending}>
          Crear canal
        </Button>
      </div>
    </Modal>
  );
}
