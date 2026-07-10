"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabaseBrowser } from "@/lib/supabase/client";
import { qk } from "@/lib/query-keys";
import { useIdentity } from "@/stores/identity";
import { notify } from "@/lib/actions/log";
import type { Comment } from "@/lib/types/database";

export function useComments(targetType: string, targetId?: string) {
  return useQuery({
    queryKey: targetId ? qk.comments(targetType, targetId) : ["comments", targetType, "none"],
    enabled: !!targetId,
    queryFn: async (): Promise<Comment[]> => {
      const { data, error } = await supabaseBrowser()
        .from("comments")
        .select("*")
        .eq("target_type", targetType)
        .eq("target_id", targetId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAddComment() {
  const qc = useQueryClient();
  const me = useIdentity((s) => s.profileId);
  return useMutation({
    mutationFn: async ({
      targetType,
      targetId,
      body,
      blockId,
      recipientId,
    }: {
      targetType: string;
      targetId: string;
      body: string;
      blockId?: string | null;
      recipientId?: string | null;
    }) => {
      const { error } = await supabaseBrowser().from("comments").insert({
        target_type: targetType,
        target_id: targetId,
        body,
        block_id: blockId ?? null,
        author_id: me,
      });
      if (error) throw error;
      if (recipientId && recipientId !== me) {
        await notify({
          recipient_id: recipientId,
          actor_id: me,
          type: "comment",
          title: "Nuevo comentario",
          body,
          target_type: targetType,
          target_id: targetId,
        });
      }
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: qk.comments(v.targetType, v.targetId) }),
  });
}
