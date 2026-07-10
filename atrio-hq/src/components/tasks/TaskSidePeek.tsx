"use client";

import { SidePeek } from "@/components/ui/SidePeek";
import { useUI } from "@/stores/ui";
import { TaskDetail } from "./TaskDetail";
import { QuickAddTask } from "./QuickAddTask";

/** Side-peek global: muestra el detalle de una tarea o el alta rápida. */
export function TaskSidePeek() {
  const peek = useUI((s) => s.peek);
  const closePeek = useUI((s) => s.closePeek);
  const open = peek !== null;

  return (
    <SidePeek open={open} onOpenChange={(v) => !v && closePeek()}>
      {peek?.kind === "task" && <TaskDetail id={peek.id} onClose={closePeek} />}
      {peek?.kind === "new-task" && (
        <QuickAddTask
          projectId={peek.projectId}
          sectionId={peek.sectionId}
          prefillTitle={peek.prefillTitle}
          onDone={closePeek}
        />
      )}
    </SidePeek>
  );
}
