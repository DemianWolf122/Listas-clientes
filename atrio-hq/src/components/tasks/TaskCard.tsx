"use client";

import { MessageSquare, GitBranch } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { StatusCheckbox, PriorityDot, DueChip, TagChips } from "./controls";
import { useProfileMap } from "@/hooks/profiles";
import { useToggleTask } from "@/hooks/tasks";
import { useUI } from "@/stores/ui";
import { usePrefs } from "@/stores/ui";
import { fireConfetti } from "@/lib/confetti";
import { playChime } from "@/lib/sound";
import { cn } from "@/lib/utils";
import type { TaskWithTags } from "@/hooks/tasks";

export function TaskCard({ task, dragging }: { task: TaskWithTags; dragging?: boolean }) {
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
      className={cn(
        "group cursor-pointer rounded-lg border border-hairline bg-canvas p-2.5 shadow-card transition-all hover:border-hairline-strong",
        dragging && "rotate-1 shadow-float"
      )}
    >
      <div className="flex items-start gap-2">
        <div className="pt-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <StatusCheckbox checked={done} onToggle={onToggle} size={16} />
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

      <div className="mt-2 flex items-center gap-2 pl-6">
        <PriorityDot value={task.priority} />
        <DueChip value={task.due_date} status={task.status} />
        <div className="flex-1" />
        {assignee && <Avatar profile={assignee} size={20} />}
      </div>
    </div>
  );
}
