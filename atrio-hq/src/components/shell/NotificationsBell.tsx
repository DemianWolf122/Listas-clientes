"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { EmptyState } from "@/components/ui/EmptyState";
import { useIdentity } from "@/stores/identity";
import { useUI } from "@/stores/ui";
import {
  useNotifications,
  useMarkAllNotifRead,
  useMarkNotifRead,
} from "@/hooks/notifications";
import { NOTIF_TYPE } from "@/lib/constants";
import { relativeTime, cn } from "@/lib/utils";
import type { Notification } from "@/lib/types/database";

export function NotificationsBell() {
  const me = useIdentity((s) => s.profileId);
  const router = useRouter();
  const openPeek = useUI((s) => s.openPeek);
  const { data: notifs } = useNotifications(me);
  const markRead = useMarkNotifRead();
  const markAll = useMarkAllNotifRead();
  const [open, setOpen] = useState(false);

  const unread = (notifs ?? []).filter((n) => !n.read_at).length;

  function go(n: Notification) {
    if (!n.read_at) markRead.mutate(n.id);
    setOpen(false);
    if (n.target_type === "task" && n.target_id) openPeek({ kind: "task", id: n.target_id });
    else if (n.target_type === "doc" && n.target_id) router.push(`/docs/${n.target_id}`);
    else if ((n.target_type === "channel" || n.target_type === "message") && n.target_id)
      router.push(`/chat/${n.target_id}`);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="icon-btn relative" aria-label="Notificaciones">
          <Bell size={17} />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-accent-fg ring-2 ring-canvas">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] p-0">
        <div className="flex items-center justify-between border-b border-hairline px-3 py-2">
          <span className="text-[13px] font-semibold">Inbox</span>
          {unread > 0 && me && (
            <button
              onClick={() => markAll.mutate(me)}
              className="flex items-center gap-1 rounded-md px-1.5 py-1 text-2xs text-ink-secondary transition-colors hover:bg-surface-hover"
            >
              <CheckCheck size={13} /> Marcar todo
            </button>
          )}
        </div>
        <div className="max-h-[380px] overflow-y-auto p-1">
          {(!notifs || notifs.length === 0) && (
            <EmptyState emoji="🌤️" title="Todo tranquilo por acá" hint="Cuando pase algo, te aviso." className="py-8" />
          )}
          {notifs?.map((n) => {
            const meta = NOTIF_TYPE[n.type as keyof typeof NOTIF_TYPE];
            return (
              <button
                key={n.id}
                onClick={() => go(n)}
                className={cn(
                  "flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-surface-hover",
                  !n.read_at && "bg-accent-soft/40"
                )}
              >
                <span className="mt-0.5 text-base leading-none">{meta?.emoji ?? "🔔"}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium text-ink">{n.title}</div>
                  {n.body && <div className="truncate text-2xs text-ink-secondary">{n.body}</div>}
                  <div className="mt-0.5 text-2xs text-ink-tertiary">{relativeTime(n.created_at)}</div>
                </div>
                {!n.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
