"use client";

import { Avatar } from "@/components/ui/Avatar";
import { TaskStatusButton, PriorityDot, DueChip, ScheduleChip, TagChips } from "./controls";
import { useProfileMap } from "@/hooks/profiles";
import { useUI } from "@/stores/ui";
import { cn } from "@/lib/utils";
import type { TaskWithTags } from "@/hooks/tasks";

export function TaskCard({ task, dragging }: { task: TaskWithTags; dragging?: boolean }) {
  const profileMap = useProfileMap();
  const openPeek = useUI((s) => s.openPeek);
  const assignee = task.assignee_id ? profileMap[task.assignee_id] : undefined;
  const done = task.status === "done";

  return (
    <div
      onClick={() => openPeek({ kind: "task", id: task.id })}
      className={cn(
        "group cursor-pointer rounded-lg border border-hairline bg-canvas p-2.5 shadow-card transition-all hover:border-hairline-strong",
        dragging && "rotate-1 shadow-float"
      )}
    >
      <div className="flex items-start gap-2">
        <div className="pt-0.5">
          <TaskStatusButton task={task} size={16} />
        </div>
        <p className={cn("flex-1 text-[13px] leading-snug text-ink", done && "text-ink-tertiary line-through")}>
          {task.title}
        </p>
      </div>

      {task.tags.length > 0 && (
        <div className="mt-2 pl-6">
          <TagChips tags={task.tags} />
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-6">
        <PriorityDot value={task.priority} />
        <ScheduleChip date={task.start_date} start={task.start_time} end={task.end_time} />
        <DueChip value={task.due_date} status={task.status} time={task.due_time} />
        <div className="flex-1" />
        {assignee && <Avatar profile={assignee} size={20} />}
      </div>
    </div>
  );
}
