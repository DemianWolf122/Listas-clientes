"use client";

import { AgendaView } from "@/components/agenda/AgendaView";
import { useAnnounceViewing } from "@/components/providers/PresenceProvider";

export default function AgendaPage() {
  useAnnounceViewing("su agenda del día");
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-hairline px-4 py-3 sm:px-6">
        <h1 className="text-lg font-semibold tracking-tight">Agenda</h1>
        <span className="hidden text-2xs text-ink-tertiary sm:inline">Organizá las horas de tu día</span>
      </header>
      <div className="min-h-0 flex-1">
        <AgendaView />
      </div>
    </div>
  );
}
