"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabaseBrowser } from "@/lib/supabase/client";
import { qk } from "@/lib/query-keys";
import { useIdentity } from "@/stores/identity";
import type { Channel, Message, Reaction } from "@/lib/types/database";

export type MessageWithReactions = Message & { reactions: Reaction[] };

export function useChannels() {
  return useQuery({
    queryKey: qk.channels,
    queryFn: async (): Promise<Channel[]> => {
      const { data, error } = await supabaseBrowser()
        .from("channels")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useChannel(id?: string) {
  const { data } = useChannels();
  return data?.find((c) => c.id === id) ?? null;
}

/** Todos los mensajes del canal (incluye replies); el split top-level/thread es client-side. */
export function useMessages(channelId?: string) {
  return useQuery({
    queryKey: channelId ? qk.messages(channelId) : ["messages", "none"],
    enabled: !!channelId,
    queryFn: async (): Promise<MessageWithReactions[]> => {
      const { data, error } = await supabaseBrowser()
        .from("messages")
        .select("*, reactions(*)")
        .eq("channel_id", channelId!)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MessageWithReactions[];
    },
  });
}

export function useUnread(profileId?: string | null) {
  return useQuery({
    queryKey: [...qk.unread, profileId ?? "none"],
    enabled: !!profileId,
    queryFn: async (): Promise<Record<string, number>> => {
      const supabase = supabaseBrowser();
      const [reads, msgs] = await Promise.all([
        supabase.from("channel_reads").select("channel_id,last_read_at").eq("profile_id", profileId!),
        supabase.from("messages").select("channel_id,created_at,author_id").is("deleted_at", null),
      ]);
      if (reads.error) throw reads.error;
      if (msgs.error) throw msgs.error;
      const readMap: Record<string, string> = {};
      (reads.data ?? []).forEach((r) => (readMap[r.channel_id] = r.last_read_at));
      const counts: Record<string, number> = {};
      (msgs.data ?? []).forEach((m) => {
        if (!m.channel_id || m.author_id === profileId) return;
        const lr = readMap[m.channel_id];
        if (!lr || new Date(m.created_at) > new Date(lr)) {
          counts[m.channel_id] = (counts[m.channel_id] ?? 0) + 1;
        }
      });
      return counts;
    },
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  const me = useIdentity((s) => s.profileId);
  return useMutation({
    mutationFn: async ({
      channelId,
      body,
      parentId,
    }: {
      channelId: string;
      body: string;
      parentId?: string | null;
    }): Promise<Message> => {
      const { data, error } = await supabaseBrowser()
        .from("messages")
        .insert({ channel_id: channelId, body, author_id: me, parent_message_id: parentId ?? null })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async ({ channelId, body, parentId }) => {
      const key = qk.messages(channelId);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<MessageWithReactions[]>(key);
      const optimistic: MessageWithReactions = {
        id: `temp-${Date.now()}`,
        channel_id: channelId,
        parent_message_id: parentId ?? null,
        author_id: me,
        body,
        content: null,
        pinned: false,
        created_at: new Date().toISOString(),
        edited_at: null,
        deleted_at: null,
        reactions: [],
      };
      qc.setQueryData<MessageWithReactions[]>(key, (old) => [...(old ?? []), optimistic]);
      return { prev, key };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.key && ctx.prev) qc.setQueryData(ctx.key, ctx.prev);
    },
    onSettled: (_d, _e, v) => {
      qc.invalidateQueries({ queryKey: qk.messages(v.channelId) });
      qc.invalidateQueries({ queryKey: qk.unread });
    },
  });
}

export function useToggleReaction() {
  const qc = useQueryClient();
  const me = useIdentity((s) => s.profileId);
  return useMutation({
    mutationFn: async ({
      messageId,
      emoji,
      on,
    }: {
      messageId: string;
      channelId: string;
      emoji: string;
      on: boolean;
    }) => {
      const supabase = supabaseBrowser();
      if (on) {
        const { error } = await supabase
          .from("reactions")
          .insert({ message_id: messageId, profile_id: me, emoji });
        if (error && error.code !== "23505") throw error;
      } else {
        const { error } = await supabase
          .from("reactions")
          .delete()
          .eq("message_id", messageId)
          .eq("profile_id", me!)
          .eq("emoji", emoji);
        if (error) throw error;
      }
    },
    onSettled: (_d, _e, v) => qc.invalidateQueries({ queryKey: qk.messages(v.channelId) }),
  });
}

export function useDeleteMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; channelId: string }) => {
      const { error } = await supabaseBrowser()
        .from("messages")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSettled: (_d, _e, v) => qc.invalidateQueries({ queryKey: qk.messages(v.channelId) }),
  });
}

export function useEditMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; channelId: string; body: string }) => {
      const { error } = await supabaseBrowser()
        .from("messages")
        .update({ body, edited_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSettled: (_d, _e, v) => qc.invalidateQueries({ queryKey: qk.messages(v.channelId) }),
  });
}

export function usePinMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, pinned }: { id: string; channelId: string; pinned: boolean }) => {
      const { error } = await supabaseBrowser().from("messages").update({ pinned }).eq("id", id);
      if (error) throw error;
    },
    onSettled: (_d, _e, v) => qc.invalidateQueries({ queryKey: qk.messages(v.channelId) }),
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  const me = useIdentity((s) => s.profileId);
  return useMutation({
    mutationFn: async (channelId: string) => {
      if (!me) return;
      const { error } = await supabaseBrowser()
        .from("channel_reads")
        .upsert(
          { channel_id: channelId, profile_id: me, last_read_at: new Date().toISOString() },
          { onConflict: "channel_id,profile_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.unread }),
  });
}

export function useCreateChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; emoji?: string; kind?: string; project_id?: string | null; sort_order?: number }) => {
      const { data, error } = await supabaseBrowser().from("channels").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.channels }),
  });
}
