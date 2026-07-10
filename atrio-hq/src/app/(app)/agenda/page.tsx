"use client";

import { AgendaView } from "@/components/agenda/AgendaView";
import { useAnnounceViewing } from "@/components/providers/PresenceProvider";

export default function AgendaPage() {
  useAnnounceViewing("su agenda del día");
  return (
    <div className="h-full">
      <AgendaView />
    </div>
  );
}
