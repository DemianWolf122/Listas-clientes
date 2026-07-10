"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { StatusCheckbox, PriorityDot, DueChip, ScheduleChip, TagChips } from "./controls";
import { useSections } from "@/hooks/projects";
import { useProjectTasks, useToggleTask, useCreateTask, type TaskWithTags } from "@/hooks/tasks";
import { useProfileMap } from "@/hooks/profiles";
import { useIdentity } from "@/stores/identity";
import { useUI, usePrefs } from "@/stores/ui";
import { fireConfetti } from "@/lib/confetti";
import { playChime } from "@/lib/sound";
import { cn } from "@/lib/utils";

export function TaskListView({ projectId }: { projectId: string }) {
  const { data: sections } = useSections(projectId);
  const { data: tasks } = useProjectTasks(projectId);

  const groups = useMemo(() => {
    const gs = (sections ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      tasks: (tasks ?? []).filter((t) => t.section_id === s.id).sort((a, b) => a.sort_order - b.sort_order),
    }));
    const orphan = (tasks ?? []).filter((t) => !t.section_id);
    if (orphan.length) gs.unshift({ id: "none", name: "Sin sección", tasks: orphan });
    return gs;
  }, [sections, tasks]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
      {groups.map((g) => (
        <div key={g.id} className="mb-6">
          <div className="flex items-center gap-2 border-b border-hairline px-2 pb-1.5">
            <span className="text-[13px] font-semibold text-ink">{g.name}</span>
            <span className="text-2xs text-ink-tertiary">{g.tasks.length}</span>
          </div>
          <div>
            {g.tasks.map((t) => (
              <TaskListRow key={t.id} task={t} />
            ))}
          </div>
          <AddRow projectId={projectId} sectionId={g.id === "none" ? null : g.id} order={g.tasks.length} />
        </div>
      ))}
      {groups.length === 0 && (
        <p className="px-2 py-8 text-center text-[13px] text-ink-tertiary">
          Este proyecto todavía no tiene secciones ni tareas.
        </p>
      )}
    </div>
  );
}

export function TaskListRow({ task }: { task: TaskWithTags }) {
  const profileMap = useProfileMap();
  const openPeek = useUI((s) => s.openPeek);
  const toggle = useToggleTask();
  const { sounds, celebrate } = usePrefs();
  const assignee = task.assignee_id ? profileMap[task.assignee_id] : undefined;
  const done = task.status === "done";

  function onToggle() {
    const willBeDone = !done;
    toggle.mutate({ task, done: willBeDone });
    if (willBeDone) {
      if (celebrate) fireConfetti();
      if (sounds) playChime();
    }
  }

  return (
    <div
      onClick={() => openPeek({ kind: "task", id: task.id })}
      className="group flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-surface-hover"
    >
      <StatusCheckbox checked={done} onToggle={onToggle} size={17} />
      <span className={cn("min-w-0 flex-1 truncate text-[14px] text-ink", done && "text-ink-tertiary line-through")}>
        {task.title}
      </span>
      <div className="hidden sm:block">
        <TagChips tags={task.tags} />
      </div>
      <ScheduleChip date={task.start_date} start={task.start_time} end={task.end_time} />
      <PriorityDot value={task.priority} />
      <DueChip value={task.due_date} status={task.status} time={task.due_time} />
      {assignee ? <Avatar profile={assignee} size={20} /> : <span className="h-5 w-5" />}
    </div>
  );
}

function AddRow({
  projectId,
  sectionId,
  order,
}: {
  projectId: string;
  sectionId: string | null;
  order: number;
}) {
  const me = useIdentity((s) => s.profileId);
  const create = useCreateTask();
  const [title, setTitle] = useState("");

  async function submit() {
    if (!title.trim()) return;
    await create.mutateAsync({
      title: title.trim(),
      project_id: projectId,
      section_id: sectionId,
      sort_order: order,
      assignee_id: me,
    });
    setTitle("");
  }

  return (
    <div className="flex items-center gap-2 px-2 py-1">
      <Plus size={15} className="text-ink-tertiary" />
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Agregar tarea"
        className="flex-1 bg-transparent py-1 text-[14px] outline-none placeholder:text-ink-tertiary"
      />
    </div>
  );
}
