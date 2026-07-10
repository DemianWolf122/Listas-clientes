"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabaseBrowser } from "@/lib/supabase/client";
import { qk } from "@/lib/query-keys";
import type { Notification } from "@/lib/types/database";

export function useNotifications(profileId?: string | null) {
  return useQuery({
    queryKey: [...qk.notifications, profileId ?? "none"],
    enabled: !!profileId,
    queryFn: async (): Promise<Notification[]> => {
      const { data, error } = await supabaseBrowser()
        .from("notifications")
        .select("*")
        .eq("recipient_id", profileId!)
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMarkNotifRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabaseBrowser()
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.notifications }),
  });
}

export function useMarkAllNotifRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (profileId: string) => {
      const { error } = await supabaseBrowser()
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("recipient_id", profileId)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.notifications }),
  });
}
