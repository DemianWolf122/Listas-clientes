"use client";

import { useEffect, useState } from "react";
import { useProfiles } from "@/hooks/profiles";
import { useIdentity } from "@/stores/identity";
import { useUI } from "@/stores/ui";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { IdentitySelector } from "./IdentitySelector";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { CommandPalette } from "@/components/command/CommandPalette";
import { TaskSidePeek } from "@/components/tasks/TaskSidePeek";

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="animate-fade-in text-4xl">🏛️</div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const profileId = useIdentity((s) => s.profileId);
  const { data: profiles } = useProfiles();
  const toggleCommand = useUI((s) => s.toggleCommand);
  const toggleSidebar = useUI((s) => s.toggleSidebar);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggleCommand();
      }
      if (meta && e.key === "\\") {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleCommand, toggleSidebar]);

  if (!mounted) return <Splash />;

  const me = profiles?.find((p) => p.id === profileId) ?? null;
  const needsSelection = !profileId || (profiles !== undefined && !me);
  if (needsSelection) return <IdentitySelector />;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-[100dvh] overflow-hidden bg-canvas text-ink">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="relative min-h-0 flex-1 overflow-hidden">
            {/* capa decorativa del tema activo (grids, hexágonos, luciérnagas…) */}
            <div aria-hidden className="theme-backdrop" />
            <div className="relative z-[1] h-full">{children}</div>
          </main>
        </div>
        <CommandPalette />
        <TaskSidePeek />
      </div>
    </TooltipProvider>
  );
}
