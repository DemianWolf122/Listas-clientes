"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Smile, Reply, Pin, MoreHorizontal, Trash2, Pencil, CheckSquare } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/Menu";
import { EmojiPicker } from "@/components/ui/EmojiPicker";
import { Tooltip } from "@/components/ui/Tooltip";
import {
  useToggleReaction,
  useDeleteMessage,
  useEditMessage,
  usePinMessage,
  type MessageWithReactions,
} from "@/hooks/chat";
import { useProfileMap } from "@/hooks/profiles";
import { useIdentity } from "@/stores/identity";
import { useUI } from "@/stores/ui";
import { formatText } from "./formatText";
import { QUICK_REACTIONS } from "@/lib/constants";
import { timeOfDay, cn } from "@/lib/utils";

export function MessageItem({
  message,
  channelId,
  grouped,
  replyCount,
  names,
  inThread,
}: {
  message: MessageWithReactions;
  channelId: string;
  grouped?: boolean;
  replyCount?: number;
  names: string[];
  inThread?: boolean;
}) {
  const me = useIdentity((s) => s.profileId);
  const profileMap = useProfileMap();
  const openThread = useUI((s) => s.openThread);
  const openPeek = useUI((s) => s.openPeek);
  const react = useToggleReaction();
  const del = useDeleteMessage();
  const edit = useEditMessage();
  const pin = usePinMessage();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.body ?? "");
  // En touch la barra de acciones arranca plegada y se abre con el botón "…".
  const [tools, setTools] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const author = message.author_id ? profileMap[message.author_id] : undefined;
  const isMine = message.author_id === me;
  const pending = message.id.startsWith("temp-");

  const reactionGroups: Record<string, string[]> = {};
  message.reactions?.forEach((r) => {
    if (r.emoji) (reactionGroups[r.emoji] ||= []).push(r.profile_id ?? "");
  });

  function toggleReaction(emoji: string) {
    const mine = reactionGroups[emoji]?.includes(me ?? "");
    react.mutate({ messageId: message.id, channelId, emoji, on: !mine });
    setTools(false);
  }

  // Tocar fuera del mensaje pliega la barra. Los popovers de Radix (emojis y
  // menú) viven en un portal, así que no cuentan como "fuera".
  useEffect(() => {
    if (!tools) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (rowRef.current?.contains(target)) return;
      if (target.closest("[data-radix-popper-content-wrapper]")) return;
      setTools(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [tools]);

  function saveEdit() {
    if (draft.trim() && draft !== message.body) edit.mutate({ id: message.id, channelId, body: draft.trim() });
    setEditing(false);
  }

  return (
    <div
      ref={rowRef}
      className={cn(
        "group relative flex gap-2.5 rounded-lg px-2 transition-colors hover:bg-surface/60",
        grouped ? "py-0.5" : "mt-3 py-0.5"
      )}
    >
      <div className="w-9 shrink-0">
        {!grouped ? (
          <Avatar profile={author} size={34} />
        ) : (
          <span className="hidden pt-1 text-right text-[10px] leading-4 text-ink-tertiary group-hover:block">
            {timeOfDay(message.created_at)}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        {!grouped && (
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] font-semibold text-ink">{author?.name ?? "Alguien"}</span>
            <span className="text-2xs text-ink-tertiary tnum">{timeOfDay(message.created_at)}</span>
            {message.pinned && <Pin size={11} className="text-ink-tertiary" />}
          </div>
        )}

        {editing ? (
          <div className="mt-0.5">
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  saveEdit();
                }
                if (e.key === "Escape") setEditing(false);
              }}
              rows={2}
              className="w-full resize-none rounded-lg border border-hairline bg-canvas px-2 py-1.5 text-[14px] outline-none focus:border-accent"
            />
            <div className="mt-1 flex items-center gap-1.5">
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={saveEdit}
                className="rounded-md bg-accent px-2.5 py-1 text-2xs font-medium text-accent-fg transition hover:opacity-90"
              >
                Guardar
              </button>
              <button
                onClick={() => setEditing(false)}
                className="rounded-md px-2 py-1 text-2xs font-medium text-ink-secondary transition hover:bg-surface-hover"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className={cn("whitespace-pre-wrap break-words text-[14px] leading-relaxed text-ink", pending && "opacity-50")}>
            {formatText(message.body ?? "", names)}
            {message.edited_at && <span className="ml-1 text-2xs text-ink-tertiary">(editado)</span>}
          </div>
        )}

        {/* reacciones */}
        {Object.keys(reactionGroups).length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {Object.entries(reactionGroups).map(([emoji, who]) => {
              const mine = who.includes(me ?? "");
              return (
                <button
                  key={emoji}
                  onClick={() => toggleReaction(emoji)}
                  className={cn(
                    "flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-2xs transition-colors",
                    mine ? "border-accent/40 bg-accent-soft text-accent" : "border-hairline bg-surface text-ink-secondary hover:bg-surface-hover"
                  )}
                >
                  <span className="text-[13px] leading-none">{emoji}</span>
                  <span className="tnum">{who.length}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* reply count */}
        {!inThread && replyCount ? (
          <button
            onClick={() => openThread(message.id)}
            className="mt-1 flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-2xs font-medium text-accent transition-colors hover:bg-accent-soft"
          >
            <Reply size={12} /> {replyCount} {replyCount === 1 ? "respuesta" : "respuestas"}
          </button>
        ) : null}
      </div>

      {/* disparador de la barra (solo touch: en desktop se usa el hover).
          Va en el flujo del row, no absoluto, para no taparle texto al mensaje. */}
      {!pending && !editing && (
        <button
          onClick={() => setTools((v) => !v)}
          aria-label="Acciones del mensaje"
          aria-expanded={tools}
          className={cn(
            "msg-trigger mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center self-start rounded-md transition-colors",
            tools ? "bg-surface-active text-ink" : "text-ink-tertiary/60"
          )}
        >
          <MoreHorizontal size={15} />
        </button>
      )}

      {/* barra de acciones: hover en desktop, plegable en touch */}
      {!pending && !editing && (
        <div
          data-open={tools}
          className="msg-tools absolute -top-3 right-2 items-center gap-0.5 rounded-lg border border-hairline bg-canvas p-0.5 shadow-popover"
        >
          {QUICK_REACTIONS.slice(0, 4).map((e) => (
            <button key={e} onClick={() => toggleReaction(e)} className="flex h-6 w-6 items-center justify-center rounded-md text-sm hover:bg-surface-hover">
              {e}
            </button>
          ))}
          <EmojiPicker onSelect={(e) => toggleReaction(e)} emojis={QUICK_REACTIONS} align="end" columns={4}>
            <button className="icon-btn h-6 w-6">
              <Smile size={14} />
            </button>
          </EmojiPicker>
          {!inThread && (
            <Tooltip content="Responder en hilo">
              <button
                className="icon-btn h-6 w-6"
                onClick={() => {
                  openThread(message.id);
                  setTools(false);
                }}
              >
                <Reply size={14} />
              </button>
            </Tooltip>
          )}
          <Menu onOpenChange={(open) => !open && setTools(false)}>
            <MenuTrigger asChild>
              <button className="icon-btn h-6 w-6">
                <MoreHorizontal size={14} />
              </button>
            </MenuTrigger>
            <MenuContent>
              <MenuItem
                onSelect={() => {
                  openPeek({ kind: "new-task", prefillTitle: message.body ?? "", sourceMessageId: message.id });
                }}
              >
                <CheckSquare size={14} /> Crear tarea desde esto
              </MenuItem>
              <MenuItem onSelect={() => pin.mutate({ id: message.id, channelId, pinned: !message.pinned })}>
                <Pin size={14} /> {message.pinned ? "Desfijar" : "Fijar mensaje"}
              </MenuItem>
              {isMine && (
                <>
                  <MenuItem onSelect={() => setEditing(true)}>
                    <Pencil size={14} /> Editar
                  </MenuItem>
                  <MenuItem
                    danger
                    onSelect={() => {
                      del.mutate({ id: message.id, channelId });
                      toast("Mensaje eliminado");
                    }}
                  >
                    <Trash2 size={14} /> Eliminar
                  </MenuItem>
                </>
              )}
            </MenuContent>
          </Menu>
        </div>
      )}
    </div>
  );
}
