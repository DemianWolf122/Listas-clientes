"use client";

import { CalendarView } from "@/components/calendar/CalendarView";
import { useAnnounceViewing } from "@/components/providers/PresenceProvider";

export default function CalendarPage() {
  useAnnounceViewing("el calendario");
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-hairline px-6 py-3">
        <h1 className="text-lg font-semibold tracking-tight">Calendario</h1>
        <span className="text-2xs text-ink-tertiary">Tareas con fecha + eventos</span>
      </header>
      <div className="min-h-0 flex-1">
        <CalendarView />
      </div>
    </div>
  );
}
