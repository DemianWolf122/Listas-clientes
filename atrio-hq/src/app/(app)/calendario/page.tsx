"use client";

import { CalendarView } from "@/components/calendar/CalendarView";
import { useAnnounceViewing } from "@/components/providers/PresenceProvider";

export default function CalendarPage() {
  useAnnounceViewing("el calendario");
  return (
    <div className="h-full">
      <CalendarView />
    </div>
  );
}
