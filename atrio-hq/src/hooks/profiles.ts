"use client";

import { useQuery } from "@tanstack/react-query";
import { supabaseBrowser } from "@/lib/supabase/client";
import { qk } from "@/lib/query-keys";
import { useIdentity } from "@/stores/identity";
import type { Profile } from "@/lib/types/database";

export function useProfiles() {
  return useQuery({
    queryKey: qk.profiles,
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabaseBrowser()
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });
}

export function useCurrentProfile(): Profile | null {
  const profileId = useIdentity((s) => s.profileId);
  const { data } = useProfiles();
  if (!profileId || !data) return null;
  return data.find((p) => p.id === profileId) ?? null;
}

/** El "otro" (esta app es de exactamente 2 personas). */
export function useOther(): Profile | null {
  const profileId = useIdentity((s) => s.profileId);
  const { data } = useProfiles();
  if (!data) return null;
  return data.find((p) => p.id !== profileId) ?? null;
}

export function useProfileMap(): Record<string, Profile> {
  const { data } = useProfiles();
  const map: Record<string, Profile> = {};
  (data ?? []).forEach((p) => (map[p.id] = p));
  return map;
}
