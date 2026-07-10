"use client";

import { useMemo, useState } from "react";
import { List, Columns3, Plus } from "lucide-react";
import { useMyTasks, useToggleTask, type TaskWithTags } from "@/hooks/tasks";
import { useIdentity } from "@/stores/identity";
import { useCurrentProfile } from "@/hooks/profiles";
import { useUI, usePrefs } from "@/stores/ui";
import { useAnnounceViewing } from "@/components/providers/PresenceProvider";
import { Segmented } from "@/components/ui/Segmented";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { StatusCheckbox, PriorityDot, DueChip, TagChips } from "@/components/tasks/controls";
import { StatusBoard } from "@/components/tasks/StatusBoard";
import { fireConfetti } from "@/lib/confetti";
import { playChime } from "@/lib/sound";
import { isOverdue, isDueToday, cn, greeting } from "@/lib/utils";

export default function MyTasksPage() {
  const me = useIdentity((s) => s.profileId);
  const profile = useCurrentProfile();
  const { data: tasks, isLoading } = useMyTasks(me);
  const openPeek = useUI((s) => s.openPeek);
  const [view, setView] = useState<"list" | "board">("list");

  useAnnounceViewing("sus tareas");

  const active = (tasks ?? []).filter((t) => t.status !== "done");
  const done = (tasks ?? []).filter((t) => t.status === "done");

  const groups = useMemo(() => {
    return [
      { key: "overdue", label: "Vencidas", emoji: "🔴", items: active.filter((t) => isOverdue(t.due_date, t.status)) },
      { key: "today", label: "Hoy", emoji: "☀️", items: active.filter((t) => isDueToday(t.due_date)) },
      {
        key: "upcoming",
        label: "Próximas",
        emoji: "📆",
        items: active.filter((t) => t.due_date && !isOverdue(t.due_date, t.status) && !isDueToday(t.due_date)),
      },
      { key: "nodate", label: "Sin fecha", emoji: "🗒️", items: active.filter((t) => !t.due_date) },
    ].filter((g) => g.items.length > 0);
  }, [active]);

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-hairline px-4 py-3 sm:px-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Mis Tareas</h1>
          <p className="text-2xs text-ink-secondary">
            {greeting()}, {profile?.name} · {active.length} pendientes
          </p>
        </div>
        <div className="flex-1" />
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: "list", label: "Lista", icon: <List size={14} /> },
            { value: "board", label: "Tablero", icon: <Columns3 size={14} /> },
          ]}
        />
        <Button variant="primary" size="sm" onClick={() => openPeek({ kind: "new-task" })}>
          <Plus size={15} /> Tarea
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden">
        {isLoading ? (
          <div className="mx-auto max-w-3xl px-6 py-6">
            <SkeletonRows rows={6} />
          </div>
        ) : (tasks ?? []).length === 0 ? (
          <EmptyState
            emoji="🌴"
            title="No tenés tareas asignadas"
            hint="Disfrutá la calma… o creá una nueva tarea para arrancar."
            className="mt-16"
            action={
              <Button variant="primary" size="sm" onClick={() => openPeek({ kind: "new-task" })}>
                <Plus size={15} /> Nueva tarea
              </Button>
            }
          />
        ) : view === "board" ? (
          <StatusBoard tasks={tasks ?? []} />
        ) : (
          <div className="mx-auto h-full max-w-3xl overflow-y-auto px-4 py-4 sm:px-6">
            {groups.map((g) => (
              <div key={g.key} className="mb-6">
                <div className="mb-1 flex items-center gap-2 px-2">
                  <span>{g.emoji}</span>
                  <span className={cn("text-[13px] font-semibold", g.key === "overdue" ? "text-priority-urgent" : "text-ink")}>
                    {g.label}
                  </span>
                  <span className="text-2xs text-ink-tertiary">{g.items.length}</span>
                </div>
                {g.items.map((t) => (
                  <MyTaskRow key={t.id} task={t} />
                ))}
              </div>
            ))}
            {done.length > 0 && (
              <details className="mb-6">
                <summary className="cursor-pointer px-2 text-[13px] font-semibold text-ink-secondary">
                  Completadas · {done.length}
                </summary>
                <div className="mt-1">
                  {done.map((t) => (
                    <MyTaskRow key={t.id} task={t} />
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MyTaskRow({ task }: { task: TaskWithTags }) {
  const openPeek = useUI((s) => s.openPeek);
  const toggle = useToggleTask();
  const { sounds, celebrate } = usePrefs();
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
      <span className={cn("min-w-0 flex-1 truncate text-[14px]", done ? "text-ink-tertiary line-through" : "text-ink")}>
        {task.title}
      </span>
      {task.project && (
        <span className="hidden items-center gap-1 rounded-md bg-surface px-1.5 py-0.5 text-2xs text-ink-secondary sm:inline-flex">
          {task.project.emoji} {task.project.name}
        </span>
      )}
      <div className="hidden sm:block">
        <TagChips tags={task.tags} />
      </div>
      <PriorityDot value={task.priority} />
      <DueChip value={task.due_date} status={task.status} />
    </div>
  );
}
