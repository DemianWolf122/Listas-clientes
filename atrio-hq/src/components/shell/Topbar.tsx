"use client";

import { Menu, PanelLeftClose, PanelLeftOpen, Plus, Eye } from "lucide-react";
import { useUI } from "@/stores/ui";
import { useOther } from "@/hooks/profiles";
import { usePresence } from "@/components/providers/PresenceProvider";
import { Avatar } from "@/components/ui/Avatar";
import { Tooltip } from "@/components/ui/Tooltip";
import { NotificationsBell } from "./NotificationsBell";
import { PRESENCE } from "@/lib/constants";

export function Topbar() {
  const collapsed = useUI((s) => s.sidebarCollapsed);
  const toggleSidebar = useUI((s) => s.toggleSidebar);
  const setMobileNav = useUI((s) => s.setMobileNav);
  const openPeek = useUI((s) => s.openPeek);
  const other = useOther();
  const { everyone } = usePresence();
  const otherMeta = other ? everyone[other.id] : undefined;
  const online = !!otherMeta;

  return (
    <header className="flex h-12 shrink-0 items-center gap-1.5 border-b border-hairline px-3">
      <button className="icon-btn md:hidden" onClick={() => setMobileNav(true)} aria-label="Menú">
        <Menu size={18} />
      </button>
      <Tooltip content="Barra lateral · ⌘\">
        <button className="icon-btn hidden md:inline-flex" onClick={toggleSidebar}>
          {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
      </Tooltip>

      <div className="flex-1" />

      {other && (
        <Tooltip
          content={
            online
              ? otherMeta?.viewing
                ? `${other.name} · viendo ${otherMeta.viewing}`
                : `${other.name} · ${PRESENCE[otherMeta!.state].label}`
              : `${other.name} · desconectada/o`
          }
        >
          <div className="flex items-center gap-1.5 rounded-full border border-hairline py-0.5 pl-0.5 pr-2.5">
            <Avatar profile={other} size={22} presence={online ? otherMeta!.state : "offline"} />
            <span className="hidden max-w-[160px] items-center gap-1 truncate text-2xs text-ink-secondary sm:flex">
              {online && otherMeta?.viewing ? (
                <>
                  <Eye size={11} /> {otherMeta.viewing}
                </>
              ) : online ? (
                otherMeta?.customStatus || PRESENCE[otherMeta!.state].label
              ) : (
                "desconectada/o"
              )}
            </span>
          </div>
        </Tooltip>
      )}

      <NotificationsBell />

      <Tooltip content="Nueva tarea">
        <button className="icon-btn" onClick={() => openPeek({ kind: "new-task" })} aria-label="Nueva tarea">
          <Plus size={18} />
        </button>
      </Tooltip>
    </header>
  );
}
