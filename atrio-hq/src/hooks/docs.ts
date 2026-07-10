"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabaseBrowser } from "@/lib/supabase/client";
import { qk } from "@/lib/query-keys";
import { useIdentity } from "@/stores/identity";
import type { Doc, DocInsert, Json } from "@/lib/types/database";

export type DocNode = Pick<
  Doc,
  "id" | "parent_doc_id" | "project_id" | "title" | "icon" | "sort_order" | "updated_at"
>;

export function useDocs() {
  return useQuery({
    queryKey: qk.docs,
    queryFn: async (): Promise<DocNode[]> => {
      const { data, error } = await supabaseBrowser()
        .from("docs")
        .select("id,parent_doc_id,project_id,title,icon,sort_order,updated_at")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useDoc(id?: string) {
  return useQuery({
    queryKey: id ? qk.doc(id) : ["doc", "none"],
    enabled: !!id,
    queryFn: async (): Promise<Doc | null> => {
      const { data, error } = await supabaseBrowser().from("docs").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateDoc() {
  const qc = useQueryClient();
  const me = useIdentity((s) => s.profileId);
  return useMutation({
    mutationFn: async (input: DocInsert = {}): Promise<Doc> => {
      const { data, error } = await supabaseBrowser()
        .from("docs")
        .insert({ ...input, created_by: input.created_by ?? me })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.docs }),
  });
}

export function useUpdateDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      title,
      icon,
      cover_url,
      content,
      project_id,
    }: {
      id: string;
      title?: string;
      icon?: string;
      cover_url?: string | null;
      content?: Json;
      project_id?: string | null;
    }) => {
      const patch: Record<string, unknown> = {};
      if (title !== undefined) patch.title = title;
      if (icon !== undefined) patch.icon = icon;
      if (cover_url !== undefined) patch.cover_url = cover_url;
      if (content !== undefined) patch.content = content;
      if (project_id !== undefined) patch.project_id = project_id;
      const { error } = await supabaseBrowser().from("docs").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: qk.docs });
      qc.invalidateQueries({ queryKey: qk.doc(v.id) });
    },
  });
}

export function useDeleteDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabaseBrowser().from("docs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.docs }),
  });
}
