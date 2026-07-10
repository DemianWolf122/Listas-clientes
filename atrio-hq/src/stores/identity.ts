"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Identidad activa (Lucila / Demian). Es UX, no auth: se guarda en localStorage.
 * El acceso a la app lo protege el passcode opcional (middleware) + RLS.
 */
interface IdentityState {
  profileId: string | null;
  setProfileId: (id: string | null) => void;
  clear: () => void;
}

export const useIdentity = create<IdentityState>()(
  persist(
    (set) => ({
      profileId: null,
      setProfileId: (id) => set({ profileId: id }),
      clear: () => set({ profileId: null }),
    }),
    { name: "atrio-identity" }
  )
);
