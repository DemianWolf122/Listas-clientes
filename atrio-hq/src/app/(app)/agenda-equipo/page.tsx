"use client";

import { TeamAgendaView } from "@/components/agenda/TeamAgendaView";
import { useAnnounceViewing } from "@/components/providers/PresenceProvider";

export default function TeamAgendaPage() {
  useAnnounceViewing("la agenda del equipo");
  return (
    <div className="h-full">
      <TeamAgendaView />
    </div>
  );
}
