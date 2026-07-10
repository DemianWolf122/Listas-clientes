"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabaseBrowser } from "@/lib/supabase/client";
import { qk } from "@/lib/query-keys";
import { useIdentity } from "@/stores/identity";
import { logActivity } from "@/lib/actions/log";
import type { Project, Section } from "@/lib/types/database";

export function useProjects() {
  return useQuery({
    queryKey: qk.projects,
    queryFn: async (): Promise<Project[]> => {
      const { data, error } = await supabaseBrowser()
        .from("projects")
        .select("*")
        .eq("archived", false)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useProject(id?: string) {
  return useQuery({
    queryKey: id ? qk.project(id) : ["project", "none"],
    enabled: !!id,
    queryFn: async (): Promise<Project | null> => {
      const { data, error } = await supabaseBrowser()
        .from("projects")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSections(projectId?: string) {
  return useQuery({
    queryKey: projectId ? qk.sections(projectId) : ["sections", "none"],
    enabled: !!projectId,
    queryFn: async (): Promise<Section[]> => {
      const { data, error } = await supabaseBrowser()
        .from("sections")
        .select("*")
        .eq("project_id", projectId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  const me = useIdentity((s) => s.profileId);
  return useMutation({
    mutationFn: async (input: { name: string; emoji?: string; client_name?: string | null; color?: string | null }) => {
      const supabase = supabaseBrowser();
      const { data, error } = await supabase
        .from("projects")
        .insert({ ...input, created_by: me })
        .select()
        .single();
      if (error) throw error;
      // secciones por defecto
      await supabase.from("sections").insert([
        { project_id: data.id, name: "Por hacer", sort_order: 0 },
        { project_id: data.id, name: "En progreso", sort_order: 1 },
        { project_id: data.id, name: "Listo", sort_order: 2 },
      ]);
      await logActivity({
        actor_id: me,
        verb: "created",
        target_type: "project",
        target_id: data.id,
        project_id: data.id,
        metadata: { name: data.name },
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.projects }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Project> & { id: string }) => {
      const { error } = await supabaseBrowser().from("projects").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: qk.projects });
      qc.invalidateQueries({ queryKey: qk.project(v.id) });
    },
  });
}

export function useCreateSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, name, sort_order }: { projectId: string; name: string; sort_order: number }) => {
      const { error } = await supabaseBrowser()
        .from("sections")
        .insert({ project_id: projectId, name, sort_order });
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: qk.sections(v.projectId) }),
  });
}

export function useUpdateSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Section> & { id: string }) => {
      const { error } = await supabaseBrowser().from("sections").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      if (v.project_id) qc.invalidateQueries({ queryKey: qk.sections(v.project_id) });
    },
  });
}

export function useDeleteSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; projectId: string }) => {
      const { error } = await supabaseBrowser().from("sections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: qk.sections(v.projectId) }),
  });
}
