"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQueryClient } from "@tanstack/react-query";
import { TaskCard } from "./TaskCard";
import { useUpdateTask } from "@/hooks/tasks";
import { usePrefs } from "@/stores/ui";
import { fireConfetti } from "@/lib/confetti";
import { playChime } from "@/lib/sound";
import { STATUS_ORDER, TASK_STATUS } from "@/lib/constants";
import type { TaskWithTags } from "@/hooks/tasks";

/** Tablero por estado (para Mis Tareas). Arrastrar cambia el status. */
export function StatusBoard({ tasks }: { tasks: TaskWithTags[] }) {
  const qc = useQueryClient();
  const update = useUpdateTask();
  const { sounds, celebrate } = usePrefs();
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const activeTask = tasks.find((t) => t.id === activeId) ?? null;

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const taskId = String(active.id);
    const overId = String(over.id);
    const targetStatus = overId.startsWith("st:")
      ? overId.slice(3)
      : tasks.find((t) => t.id === overId)?.status;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !targetStatus || task.status === targetStatus) return;

    const completed_at = targetStatus === "done" ? new Date().toISOString() : null;
    qc.setQueriesData<TaskWithTags[]>({ queryKey: ["my-tasks"] }, (old) =>
      (old ?? []).map((t) => (t.id === taskId ? { ...t, status: targetStatus, completed_at } : t))
    );
    update.mutate({ id: taskId, status: targetStatus, completed_at });
    if (targetStatus === "done") {
      if (celebrate) fireConfetti();
      if (sounds) playChime();
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(e) => setActiveId(String(e.active.id))}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex h-full gap-3 overflow-x-auto p-4">
        {STATUS_ORDER.map((status) => {
          const list = tasks.filter((t) => t.status === status);
          return <StatusColumn key={status} status={status} tasks={list} />;
        })}
      </div>
      <DragOverlay>{activeTask ? <TaskCard task={activeTask} dragging /> : null}</DragOverlay>
    </DndContext>
  );
}

function StatusColumn({ status, tasks }: { status: string; tasks: TaskWithTags[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: `st:${status}` });
  const meta = TASK_STATUS[status as keyof typeof TASK_STATUS];
  return (
    <div className="flex w-[290px] shrink-0 flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: meta?.color }} />
        <span className="text-[13px] font-semibold text-ink">{meta?.label}</span>
        <span className="text-2xs text-ink-tertiary">{tasks.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-[80px] flex-1 flex-col gap-2 rounded-xl p-1 transition-colors ${isOver ? "bg-surface" : ""}`}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((t) => (
            <SortableCard key={t.id} task={t} />
          ))}
        </SortableContext>
        {tasks.length === 0 && <p className="px-2 py-4 text-2xs text-ink-tertiary">Nada acá</p>}
      </div>
    </div>
  );
}

function SortableCard({ task }: { task: TaskWithTags }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      {...attributes}
      {...listeners}
    >
      <TaskCard task={task} />
    </div>
  );
}
