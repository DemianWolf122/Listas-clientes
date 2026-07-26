"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SidePeek =
  | { kind: "task"; id: string }
  | { kind: "new-task"; projectId?: string; sectionId?: string; prefillTitle?: string; sourceMessageId?: string }
  | null;

interface UIState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebar: (v: boolean) => void;

  mobileNavOpen: boolean;
  setMobileNav: (v: boolean) => void;

  peek: SidePeek;
  openPeek: (p: NonNullable<SidePeek>) => void;
  closePeek: () => void;

  threadMessageId: string | null;
  openThread: (id: string) => void;
  closeThread: () => void;

  commandOpen: boolean;
  setCommandOpen: (v: boolean) => void;
  toggleCommand: () => void;

  /** Fecha (yyyy-MM-dd) que la Agenda debe abrir en vista Día al montar (salto desde Calendario). */
  agendaFocus: string | null;
  setAgendaFocus: (d: string | null) => void;
}

export const useUI = create<UIState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebar: (v) => set({ sidebarCollapsed: v }),

  mobileNavOpen: false,
  setMobileNav: (v) => set({ mobileNavOpen: v }),

  peek: null,
  openPeek: (p) => set({ peek: p }),
  closePeek: () => set({ peek: null }),

  threadMessageId: null,
  openThread: (id) => set({ threadMessageId: id }),
  closeThread: () => set({ threadMessageId: null }),

  commandOpen: false,
  setCommandOpen: (v) => set({ commandOpen: v }),
  toggleCommand: () => set((s) => ({ commandOpen: !s.commandOpen })),

  agendaFocus: null,
  setAgendaFocus: (d) => set({ agendaFocus: d }),
}));

/** Preferencias persistidas (sonidos, etc.). */
interface PrefsState {
  sounds: boolean;
  toggleSounds: () => void;
  celebrate: boolean;
  toggleCelebrate: () => void;

  /** Rutina: sub-calendarios ocultos por persona (cada uno arma su vista). */
  routineHidden: Record<string, string[]>;
  toggleRoutineArea: (profileId: string, area: string) => void;
  showAllRoutineAreas: (profileId: string) => void;
  /** Rutina: superponer las tareas con horario y los eventos del equipo. */
  routineShowAgenda: boolean;
  toggleRoutineShowAgenda: () => void;
}

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      sounds: false,
      toggleSounds: () => set((s) => ({ sounds: !s.sounds })),
      celebrate: true,
      toggleCelebrate: () => set((s) => ({ celebrate: !s.celebrate })),

      routineHidden: {},
      toggleRoutineArea: (profileId, area) =>
        set((s) => {
          const current = s.routineHidden[profileId] ?? [];
          const next = current.includes(area) ? current.filter((a) => a !== area) : [...current, area];
          return { routineHidden: { ...s.routineHidden, [profileId]: next } };
        }),
      showAllRoutineAreas: (profileId) =>
        set((s) => ({ routineHidden: { ...s.routineHidden, [profileId]: [] } })),
      routineShowAgenda: true,
      toggleRoutineShowAgenda: () => set((s) => ({ routineShowAgenda: !s.routineShowAgenda })),
    }),
    { name: "atrio-prefs" }
  )
);
