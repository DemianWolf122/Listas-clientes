"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabaseBrowser } from "@/lib/supabase/client";
import { qk } from "@/lib/query-keys";
import { useIdentity } from "@/stores/identity";
import { logActivity, notify } from "@/lib/actions/log";
import type { Task, TaskInsert, Tag, Project } from "@/lib/types/database";

export type TaskWithTags = Task & {
  tags: Tag[];
  project?: Pick<Project, "name" | "emoji" | "color"> | null;
};

const SELECT = "*, projects(name,emoji,color), task_tags(tags(id,name,color))";

function mapTask(row: any): TaskWithTags {
  const tags: Tag[] = (row.task_tags ?? []).map((tt: any) => tt.tags).filter(Boolean);
  const project = row.projects ?? null;
  const { task_tags, projects, ...rest } = row;
  return { ...(rest as Task), tags, project };
}

export function useProjectTasks(projectId?: string) {
  return useQuery({
    queryKey: projectId ? qk.tasksByProject(projectId) : ["tasks", "project", "none"],
    enabled: !!projectId,
    queryFn: async (): Promise<TaskWithTags[]> => {
      const { data, error } = await supabaseBrowser()
        .from("tasks")
        .select(SELECT)
        .eq("project_id", projectId!)
        .is("parent_task_id", null)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(mapTask);
    },
  });
}

export function useMyTasks(profileId?: string | null) {
  return useQuery({
    queryKey: [...qk.myTasks, profileId ?? "none"],
    enabled: !!profileId,
    queryFn: async (): Promise<TaskWithTags[]> => {
      const { data, error } = await supabaseBrowser()
        .from("tasks")
        .select(SELECT)
        .eq("assignee_id", profileId!)
        .is("parent_task_id", null)
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []).map(mapTask);
    },
  });
}

export function useAllTasks() {
  return useQuery({
    queryKey: qk.allTasks,
    queryFn: async (): Promise<TaskWithTags[]> => {
      const { data, error } = await supabaseBrowser()
        .from("tasks")
        .select(SELECT)
        .is("parent_task_id", null)
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []).map(mapTask);
    },
  });
}

export function useTask(id?: string) {
  return useQuery({
    queryKey: id ? qk.task(id) : ["task", "none"],
    enabled: !!id,
    queryFn: async (): Promise<TaskWithTags | null> => {
      const { data, error } = await supabaseBrowser()
        .from("tasks")
        .select(SELECT)
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data ? mapTask(data) : null;
    },
  });
}

export function useSubtasks(taskId?: string) {
  return useQuery({
    queryKey: taskId ? qk.subtasks(taskId) : ["subtasks", "none"],
    enabled: !!taskId,
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabaseBrowser()
        .from("tasks")
        .select("*")
        .eq("parent_task_id", taskId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function invalidateTaskFamilies(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["tasks"] });
  qc.invalidateQueries({ queryKey: ["task"] });
  qc.invalidateQueries({ queryKey: ["subtasks"] });
  qc.invalidateQueries({ queryKey: ["my-tasks"] });
  qc.invalidateQueries({ queryKey: ["all-tasks"] });
  qc.invalidateQueries({ queryKey: ["home"] });
}

export function useCreateTask() {
  const qc = useQueryClient();
  const me = useIdentity((s) => s.profileId);
  return useMutation({
    mutationFn: async (input: TaskInsert): Promise<Task> => {
      const { data, error } = await supabaseBrowser()
        .from("tasks")
        .insert({ ...input, created_by: input.created_by ?? me })
        .select()
        .single();
      if (error) throw error;
      if (!input.parent_task_id) {
        await logActivity({
          actor_id: me,
          verb: "created",
          target_type: "task",
          target_id: data.id,
          project_id: data.project_id,
          metadata: { title: data.title },
        });
      }
      if (data.assignee_id && data.assignee_id !== me) {
        await notify({
          recipient_id: data.assignee_id,
          actor_id: me,
          type: "assigned",
          title: `📌 ${data.title}`,
          body: "Nueva tarea asignada para vos",
          target_type: "task",
          target_id: data.id,
        });
      }
      return data;
    },
    onSuccess: () => invalidateTaskFamilies(qc),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  const me = useIdentity((s) => s.profileId);
  return useMutation({
    mutationFn: async ({
      id,
      notifyAssignee,
      ...patch
    }: Partial<Task> & { id: string; notifyAssignee?: boolean }) => {
      const { data, error } = await supabaseBrowser()
        .from("tasks")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      if (notifyAssignee && patch.assignee_id && patch.assignee_id !== me) {
        await notify({
          recipient_id: patch.assignee_id,
          actor_id: me,
          type: "assigned",
          title: `📌 ${data.title}`,
          body: "Te asignaron esta tarea",
          target_type: "task",
          target_id: id,
        });
      }
      return data;
    },
    onSuccess: () => invalidateTaskFamilies(qc),
  });
}

/** Completar / descompletar con optimistic update sobre el tablero del proyecto. */
export function useToggleTask() {
  const qc = useQueryClient();
  const me = useIdentity((s) => s.profileId);
  return useMutation({
    mutationFn: async ({ task, done }: { task: Task; done: boolean }) => {
      const patch = done
        ? { status: "done", completed_at: new Date().toISOString() }
        : { status: "todo", completed_at: null };
      const { error } = await supabaseBrowser().from("tasks").update(patch).eq("id", task.id);
      if (error) throw error;
      if (done) {
        await logActivity({
          actor_id: me,
          verb: "completed",
          target_type: "task",
          target_id: task.id,
          project_id: task.project_id,
          metadata: { title: task.title },
        });
      }
    },
    onMutate: async ({ task, done }) => {
      if (!task.project_id) return;
      const key = qk.tasksByProject(task.project_id);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<TaskWithTags[]>(key);
      qc.setQueryData<TaskWithTags[]>(key, (old) =>
        (old ?? []).map((t) =>
          t.id === task.id
            ? { ...t, status: done ? "done" : "todo", completed_at: done ? new Date().toISOString() : null }
            : t
        )
      );
      return { prev, key };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.key && ctx.prev) qc.setQueryData(ctx.key, ctx.prev);
    },
    onSettled: () => invalidateTaskFamilies(qc),
  });
}

/** Mover tarea entre secciones / reordenar (drag), optimista en el tablero. */
export function useMoveTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      section_id,
      sort_order,
      status,
    }: {
      id: string;
      projectId: string;
      section_id: string | null;
      sort_order: number;
      status?: string;
    }) => {
      const patch: Record<string, unknown> = { section_id, sort_order };
      if (status) patch.status = status;
      const { error } = await supabaseBrowser().from("tasks").update(patch).eq("id", id);
      if (error) throw error;
    },
    onMutate: async (v) => {
      const key = qk.tasksByProject(v.projectId);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<TaskWithTags[]>(key);
      qc.setQueryData<TaskWithTags[]>(key, (old) =>
        (old ?? []).map((t) =>
          t.id === v.id
            ? { ...t, section_id: v.section_id, sort_order: v.sort_order, status: v.status ?? t.status }
            : t
        )
      );
      return { prev, key };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.key && ctx.prev) qc.setQueryData(ctx.key, ctx.prev);
    },
    onSettled: (_d, _e, v) => qc.invalidateQueries({ queryKey: qk.tasksByProject(v.projectId) }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabaseBrowser().from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateTaskFamilies(qc),
  });
}
