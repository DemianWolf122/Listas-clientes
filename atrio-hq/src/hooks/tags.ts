"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabaseBrowser } from "@/lib/supabase/client";
import { qk } from "@/lib/query-keys";
import { PASTELS } from "@/lib/constants";
import type { Tag } from "@/lib/types/database";

export function useTags() {
  return useQuery({
    queryKey: qk.tags,
    queryFn: async (): Promise<Tag[]> => {
      const { data, error } = await supabaseBrowser().from("tags").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 2 * 60_000,
  });
}

export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string): Promise<Tag> => {
      const color = PASTELS[Math.floor(name.length) % PASTELS.length];
      const { data, error } = await supabaseBrowser()
        .from("tags")
        .insert({ name, color })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.tags }),
  });
}

export function useToggleTaskTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, tagId, on }: { taskId: string; tagId: string; on: boolean }) => {
      const supabase = supabaseBrowser();
      if (on) {
        const { error } = await supabase.from("task_tags").insert({ task_id: taskId, tag_id: tagId });
        if (error && error.code !== "23505") throw error;
      } else {
        const { error } = await supabase
          .from("task_tags")
          .delete()
          .eq("task_id", taskId)
          .eq("tag_id", tagId);
        if (error) throw error;
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: qk.task(v.taskId) });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["all-tasks"] });
      qc.invalidateQueries({ queryKey: ["my-tasks"] });
    },
  });
}
