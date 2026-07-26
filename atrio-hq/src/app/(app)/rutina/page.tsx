"use client";

import { RoutineView } from "@/components/routine/RoutineView";
import { useAnnounceViewing } from "@/components/providers/PresenceProvider";

export default function RutinaPage() {
  useAnnounceViewing("su rutina");
  return (
    <div className="h-full">
      <RoutineView />
    </div>
  );
}
