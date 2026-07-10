"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Pin, X, Hash } from "lucide-react";
import { MessageItem } from "./MessageItem";
import { SidePeek } from "@/components/ui/SidePeek";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  useChannel,
  useMessages,
  useMarkRead,
  useSendMessage,
  type MessageWithReactions,
} from "@/hooks/chat";
import { useProfiles, useProfileMap, useOther, useCurrentProfile } from "@/hooks/profiles";
import { useIdentity } from "@/stores/identity";
import { useUI, usePrefs } from "@/stores/ui";
import { usePresence, useAnnounceViewing } from "@/components/providers/PresenceProvider";
import { notify } from "@/lib/actions/log";
import { playPop } from "@/lib/sound";
import { cn } from "@/lib/utils";

export function ChatView({ channelId }: { channelId: string }) {
  const channel = useChannel(channelId);
  const { data: messages } = useMessages(channelId);
  const { data: profiles } = useProfiles();
  const markRead = useMarkRead();
  const me = useIdentity((s) => s.profileId);
  const { sounds } = usePrefs();
  const threadMessageId = useUI((s) => s.threadMessageId);
  const closeThread = useUI((s) => s.closeThread);

  const scrollRef = useRef<HTMLDivElement>(null);
  const prevCount = useRef(0);
  const names = (profiles ?? []).map((p) => p.name);

  useAnnounceViewing(channel ? `#${channel.name}` : null);

  const { topLevel, repliesByParent, pinned } = useMemo(() => {
    const all = messages ?? [];
    const top = all.filter((m) => !m.parent_message_id);
    const replies: Record<string, MessageWithReactions[]> = {};
    all.forEach((m) => {
      if (m.parent_message_id) (replies[m.parent_message_id] ||= []).push(m);
    });
    return { topLevel: top, repliesByParent: replies, pinned: top.filter((m) => m.pinned) };
  }, [messages]);

  // scroll al fondo + sonido en mensajes entrantes
  useEffect(() => {
    const count = topLevel.length;
    if (count !== prevCount.current) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      const last = topLevel[count - 1];
      if (count > prevCount.current && prevCount.current > 0 && last && last.author_id !== me && sounds) {
        playPop();
      }
      prevCount.current = count;
    }
  }, [topLevel, me, sounds]);

  // marcar leído
  useEffect(() => {
    if (channelId) markRead.mutate(channelId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, messages?.length]);

  const threadParent = threadMessageId ? (messages ?? []).find((m) => m.id === threadMessageId) : null;

  return (
    <div className="flex h-full flex-col">
      {/* header */}
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-hairline px-4">
        <span className="text-base">{channel?.emoji}</span>
        <h1 className="text-[15px] font-semibold text-ink">{channel?.name}</h1>
        {channel?.kind === "dm" && <span className="text-2xs text-ink-tertiary">mensaje directo</span>}
      </header>

      {/* pinned */}
      {pinned.length > 0 && (
        <div className="flex items-center gap-2 border-b border-hairline bg-surface/60 px-4 py-1.5 text-2xs text-ink-secondary">
          <Pin size={12} />
          <span className="truncate">{pinned[pinned.length - 1].body}</span>
        </div>
      )}

      {/* mensajes */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {topLevel.length === 0 ? (
          <EmptyState
            emoji={channel?.emoji ?? "💬"}
            title="Todavía no hay mensajes"
            hint="Rompé el hielo con el primer mensaje. 👋"
            className="mt-16"
          />
        ) : (
          topLevel.map((m, i) => {
            const prev = topLevel[i - 1];
            const grouped =
              !!prev &&
              prev.author_id === m.author_id &&
              new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60_000;
            return (
              <MessageItem
                key={m.id}
                message={m}
                channelId={channelId}
                grouped={grouped}
                replyCount={repliesByParent[m.id]?.length ?? 0}
                names={names}
              />
            );
          })
        )}
      </div>

      {/* composer */}
      <Composer channelId={channelId} placeholder={`Mensaje en #${channel?.name ?? ""}`} />

      {/* thread */}
      <SidePeek open={!!threadParent} onOpenChange={(v) => !v && closeThread()} dim={false}>
        {threadParent && (
          <ThreadPanel
            parent={threadParent}
            replies={repliesByParent[threadParent.id] ?? []}
            channelId={channelId}
            names={names}
            onClose={closeThread}
          />
        )}
      </SidePeek>
    </div>
  );
}

function Composer({
  channelId,
  parentId,
  placeholder,
}: {
  channelId: string;
  parentId?: string;
  placeholder: string;
}) {
  const send = useSendMessage();
  const { sendTyping, typingByChannel } = usePresence();
  const channel = useChannel(channelId);
  const other = useOther();
  const meProfile = useCurrentProfile();
  const me = useIdentity((s) => s.profileId);
  const [text, setText] = useState("");
  const lastTyping = useRef(0);

  const typing = (typingByChannel[channelId] ?? []).filter((id) => id !== me);
  const profileMap = useProfileMap();

  function onChange(v: string) {
    setText(v);
    const now = Date.now();
    if (now - lastTyping.current > 1500) {
      sendTyping(channelId);
      lastTyping.current = now;
    }
  }

  async function submit() {
    const body = text.trim();
    if (!body) return;
    setText("");
    await send.mutateAsync({ channelId, body, parentId });
    if (other && me) {
      const dm = channel?.kind === "dm";
      const mention = body.includes(`@${other.name}`);
      if ((dm || mention) && !parentId) {
        await notify({
          recipient_id: other.id,
          actor_id: me,
          type: dm ? "message" : "mention",
          title: dm ? `Mensaje de ${meProfile?.name}` : `${meProfile?.name} te mencionó`,
          body,
          target_type: "channel",
          target_id: channelId,
        });
      }
    }
  }

  return (
    <div className="shrink-0 px-3 pb-3">
      {typing.length > 0 && (
        <div className="px-2 pb-1 text-2xs text-ink-tertiary">
          {typing.map((id) => profileMap[id]?.name).filter(Boolean).join(", ")} está escribiendo…
        </div>
      )}
      <div className="flex items-end gap-2 rounded-xl border border-hairline bg-canvas px-3 py-2 shadow-card focus-within:border-accent">
        <textarea
          value={text}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          placeholder={placeholder}
          className="max-h-32 flex-1 resize-none bg-transparent py-1 text-[14px] outline-none placeholder:text-ink-tertiary"
        />
        <button
          onClick={submit}
          disabled={!text.trim()}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-fg transition-opacity disabled:opacity-30"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}

function ThreadPanel({
  parent,
  replies,
  channelId,
  names,
  onClose,
}: {
  parent: MessageWithReactions;
  replies: MessageWithReactions[];
  channelId: string;
  names: string[];
  onClose: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-hairline px-4">
        <span className="text-sm font-semibold">Hilo</span>
        <button className="icon-btn" onClick={onClose}>
          <X size={16} />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        <MessageItem message={parent} channelId={channelId} names={names} inThread />
        <div className="my-2 flex items-center gap-2 px-3 text-2xs text-ink-tertiary">
          <div className="h-px flex-1 bg-hairline" />
          {replies.length} {replies.length === 1 ? "respuesta" : "respuestas"}
          <div className="h-px flex-1 bg-hairline" />
        </div>
        {replies.map((r) => (
          <MessageItem key={r.id} message={r} channelId={channelId} names={names} inThread />
        ))}
      </div>
      <Composer channelId={channelId} parentId={parent.id} placeholder="Responder en el hilo…" />
    </div>
  );
}
