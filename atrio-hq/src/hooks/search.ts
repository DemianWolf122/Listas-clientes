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
      // el filtro .or() usa comas/paréntesis como sintaxis → los sacamos del valor
      const orSafe = `%${q.replace(/[(),]/g, " ").trim()}%`;
      const [tasks, docs, messages, projects] = await Promise.all([
        // título O descripción
        supabase
          .from("tasks")
          .select("id,title,project_id")
          .or(`title.ilike.${orSafe},description.ilike.${orSafe}`)
          .limit(6),
        // título O contenido de los bloques (función SQL search_docs)
        supabase.rpc("search_docs", { q }),
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
        docs: (docs.data as SearchResults["docs"]) ?? [],
        messages: messages.data ?? [],
        projects: projects.data ?? [],
      };
    },
    placeholderData: EMPTY,
  });
}
