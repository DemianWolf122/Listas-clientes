"use client";

import { useQuery } from "@tanstack/react-query";
import { supabaseBrowser } from "@/lib/supabase/client";
import { qk } from "@/lib/query-keys";
import type { Activity } from "@/lib/types/database";

export function useActivity({ projectId, limit = 30 }: { projectId?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: [...qk.activity, projectId ?? "all", limit],
    queryFn: async (): Promise<Activity[]> => {
      let q = supabaseBrowser()
        .from("activity")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (projectId) q = q.eq("project_id", projectId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}
