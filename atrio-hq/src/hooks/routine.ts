"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabaseBrowser } from "@/lib/supabase/client";
import { qk } from "@/lib/query-keys";
import { useIdentity } from "@/stores/identity";
import type { RoutineBlock, RoutineBlockInsert } from "@/lib/types/database";

/**
 * Bloques de rutina de UNA persona. Se traen todos (son pocos y muchos se
 * repiten) y la expansión a cada día la hace el cliente con `occursOn`, así
 * mover de semana no dispara un fetch nuevo.
 */
export function useRoutineBlocks(profileId?: string | null) {
  return useQuery({
    queryKey: qk.routine(profileId ?? "none"),
    enabled: Boolean(profileId),
    queryFn: async (): Promise<RoutineBlock[]> => {
      const { data, error } = await supabaseBrowser()
        .from("routine_blocks")
        .select("*")
        .eq("profile_id", profileId!)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["routine"] });
}

export function useCreateRoutineBlock() {
  const invalidate = useInvalidate();
  const me = useIdentity((s) => s.profileId);
  return useMutation({
    mutationFn: async (input: RoutineBlockInsert) => {
      const { data, error } = await supabaseBrowser()
        .from("routine_blocks")
        .insert({ ...input, created_by: input.created_by ?? me })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateRoutineBlock() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<RoutineBlock> & { id: string }) => {
      const { error } = await supabaseBrowser().from("routine_blocks").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteRoutineBlock() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabaseBrowser().from("routine_blocks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
