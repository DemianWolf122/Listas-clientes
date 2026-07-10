"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { ChevronsUpDown, LogOut, Moon, Sun, Volume2, VolumeX, PartyPopper } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { Avatar } from "@/components/ui/Avatar";
import { useCurrentProfile } from "@/hooks/profiles";
import { useIdentity } from "@/stores/identity";
import { usePresence } from "@/components/providers/PresenceProvider";
import { usePrefs } from "@/stores/ui";
import { PRESENCE, type PresenceState } from "@/lib/constants";
import { cn } from "@/lib/utils";

const STATES: PresenceState[] = ["online", "idle", "dnd"];
const STATUS_PRESETS = ["🎨 diseñando", "💻 en código", "☕ en break", "🔴 no molestar", "🎧 foco"];

export function UserChip({ collapsed }: { collapsed?: boolean }) {
  const me = useCurrentProfile();
  const clear = useIdentity((s) => s.clear);
  const { selfState, setSelfState, customStatus, setCustomStatus } = usePresence();
  const { sounds, toggleSounds, celebrate, toggleCelebrate } = usePrefs();
  const { theme, setTheme } = useTheme();
  const [draft, setDraft] = useState("");

  if (!me) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface-hover",
            collapsed && "justify-center px-0"
          )}
        >
          <Avatar profile={me} size={26} presence={selfState} />
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-ink">{me.name}</div>
                <div className="truncate text-2xs text-ink-secondary">
                  {customStatus || PRESENCE[selfState].label}
                </div>
              </div>
              <ChevronsUpDown size={14} className="text-ink-tertiary" />
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[280px] p-2">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <Avatar profile={me} size={38} presence={selfState} />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{me.name}</div>
            <div className="truncate text-2xs text-ink-secondary">{me.role}</div>
          </div>
        </div>

        <div className="my-1.5 h-px bg-hairline" />

        <div className="px-1 pb-1 text-2xs font-medium uppercase tracking-wide text-ink-tertiary">
          Estado
        </div>
        <div className="flex gap-1 px-1">
          {STATES.map((s) => (
            <button
              key={s}
              onClick={() => setSelfState(s)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-2xs font-medium transition-colors",
                selfState === s ? "border-transparent bg-surface-active text-ink" : "border-hairline text-ink-secondary hover:bg-surface-hover"
              )}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: PRESENCE[s].color }} />
              {PRESENCE[s].label}
            </button>
          ))}
        </div>

        <div className="mt-2 px-1">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && draft.trim()) {
                setCustomStatus(draft.trim());
                setDraft("");
              }
            }}
            placeholder={customStatus || "Estado personalizado…"}
            className="w-full rounded-md border border-hairline bg-canvas px-2 py-1.5 text-[13px] outline-none focus:border-accent"
          />
          <div className="mt-1.5 flex flex-wrap gap-1">
            {STATUS_PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setCustomStatus(p)}
                className="rounded-md bg-surface px-1.5 py-1 text-2xs text-ink-secondary transition-colors hover:bg-surface-hover"
              >
                {p}
              </button>
            ))}
            {customStatus && (
              <button
                onClick={() => setCustomStatus(null)}
                className="rounded-md px-1.5 py-1 text-2xs text-priority-urgent hover:bg-priority-urgent/10"
              >
                limpiar
              </button>
            )}
          </div>
        </div>

        <div className="my-1.5 h-px bg-hairline" />

        <MenuRow
          icon={theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          label={theme === "dark" ? "Modo claro" : "Modo oscuro"}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        />
        <MenuRow
          icon={sounds ? <Volume2 size={15} /> : <VolumeX size={15} />}
          label={sounds ? "Sonidos: on" : "Sonidos: off"}
          onClick={toggleSounds}
        />
        <MenuRow
          icon={<PartyPopper size={15} />}
          label={celebrate ? "Celebraciones: on" : "Celebraciones: off"}
          onClick={toggleCelebrate}
        />
        <div className="my-1.5 h-px bg-hairline" />
        <MenuRow icon={<LogOut size={15} />} label="Cambiar de persona" onClick={clear} danger />
      </PopoverContent>
    </Popover>
  );
}

function MenuRow({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition-colors hover:bg-surface-hover",
        danger ? "text-priority-urgent hover:bg-priority-urgent/10" : "text-ink"
      )}
    >
      <span className="text-ink-secondary">{icon}</span>
      {label}
    </button>
  );
}
