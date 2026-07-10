"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabaseBrowser } from "@/lib/supabase/client";
import { qk } from "@/lib/query-keys";
import { useIdentity } from "@/stores/identity";
import type { CalEvent } from "@/lib/types/database";

export function useEvents() {
  return useQuery({
    queryKey: qk.events,
    queryFn: async (): Promise<CalEvent[]> => {
      const { data, error } = await supabaseBrowser()
        .from("events")
        .select("*")
        .order("starts_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  const me = useIdentity((s) => s.profileId);
  return useMutation({
    mutationFn: async (input: Omit<CalEvent, "id" | "created_by"> & { created_by?: string | null }) => {
      const { data, error } = await supabaseBrowser()
        .from("events")
        .insert({ ...input, created_by: input.created_by ?? me })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.events }),
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<CalEvent> & { id: string }) => {
      const { error } = await supabaseBrowser().from("events").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.events }),
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabaseBrowser().from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.events }),
  });
}
