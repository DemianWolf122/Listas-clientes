"use client";

import { useQuery } from "@tanstack/react-query";
import { supabaseBrowser } from "@/lib/supabase/client";

export interface SearchResults {
  tasks: { id: string; title: string; project_id: string | null }[];
  docs: { id: string; title: string; icon: string }[];
  messages: { id: string; body: string | null; channel_id: string | null }[];
  projects: { id: string; name: string; emoji: string }[];
}

const EMPTY: SearchResults = { tasks: [], docs: [], messages: [], projects: [] };

export function useSearch(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: ["search", q],
    enabled: q.length >= 1,
    queryFn: async (): Promise<SearchResults> => {
      const supabase = supabaseBrowser();
      const like = `%${q}%`;
      const [tasks, docs, messages, projects] = await Promise.all([
        supabase.from("tasks").select("id,title,project_id").ilike("title", like).limit(6),
        supabase.from("docs").select("id,title,icon").ilike("title", like).limit(6),
        supabase
          .from("messages")
          .select("id,body,channel_id")
          .is("deleted_at", null)
          .ilike("body", like)
          .limit(6),
        supabase.from("projects").select("id,name,emoji").ilike("name", like).limit(6),
      ]);
      return {
        tasks: tasks.data ?? [],
        docs: docs.data ?? [],
        messages: messages.data ?? [],
        projects: projects.data ?? [],
      };
    },
    placeholderData: EMPTY,
  });
}
