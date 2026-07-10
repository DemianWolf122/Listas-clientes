"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus } from "lucide-react";
import { TaskCard } from "./TaskCard";
import { useSections, useCreateSection } from "@/hooks/projects";
import { useProjectTasks, useMoveTask, useCreateTask, type TaskWithTags } from "@/hooks/tasks";
import { useIdentity } from "@/stores/identity";
import { orderBetween, cn } from "@/lib/utils";

const NONE = "none";

export function Board({ projectId }: { projectId: string }) {
  const { data: sections } = useSections(projectId);
  const { data: tasks } = useProjectTasks(projectId);
  const move = useMoveTask();
  const createSection = useCreateSection();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [addingSection, setAddingSection] = useState(false);
  const [sectionName, setSectionName] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const columns = useMemo(() => {
    const cols: { id: string; name: string; tasks: TaskWithTags[] }[] = (sections ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      tasks: (tasks ?? [])
        .filter((t) => t.section_id === s.id)
        .sort((a, b) => a.sort_order - b.sort_order),
    }));
    const orphan = (tasks ?? []).filter((t) => !t.section_id);
    if (orphan.length) {
      cols.unshift({ id: NONE, name: "Sin sección", tasks: orphan.sort((a, b) => a.sort_order - b.sort_order) });
    }
    return cols;
  }, [sections, tasks]);

  const activeTask = (tasks ?? []).find((t) => t.id === activeId) ?? null;

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const activeTaskId = String(active.id);
    const overId = String(over.id);
    const dragged = (tasks ?? []).find((t) => t.id === activeTaskId);
    if (!dragged) return;

    let targetSection: string | null;
    let overTaskId: string | null = null;
    if (overId.startsWith("col:")) {
      const raw = overId.slice(4);
      targetSection = raw === NONE ? null : raw;
    } else {
      overTaskId = overId;
      const overTask = (tasks ?? []).find((t) => t.id === overId);
      targetSection = overTask?.section_id ?? null;
    }

    const listId = targetSection ?? NONE;
    const list = (columns.find((c) => c.id === listId)?.tasks ?? []).filter((t) => t.id !== activeTaskId);
    let index = overTaskId ? list.findIndex((t) => t.id === overTaskId) : list.length;
    if (index < 0) index = list.length;
    const before = list[index - 1]?.sort_order ?? null;
    const after = list[index]?.sort_order ?? null;
    const sort_order = orderBetween(before, after);

    if (dragged.section_id === targetSection && dragged.sort_order === sort_order) return;
    move.mutate({ id: activeTaskId, projectId, section_id: targetSection, sort_order });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex h-full gap-3 overflow-x-auto p-4">
        {columns.map((col) => (
          <Column key={col.id} id={col.id} name={col.name} tasks={col.tasks} projectId={projectId} />
        ))}

        <div className="w-[280px] shrink-0">
          {addingSection ? (
            <input
              autoFocus
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
              onBlur={() => setAddingSection(false)}
              onKeyDown={async (e) => {
                if (e.key === "Enter" && sectionName.trim()) {
                  await createSection.mutateAsync({
                    projectId,
                    name: sectionName.trim(),
                    sort_order: (sections?.length ?? 0) + 1,
                  });
                  setSectionName("");
                  setAddingSection(false);
                }
                if (e.key === "Escape") setAddingSection(false);
              }}
              placeholder="Nombre de la sección"
              className="w-full rounded-lg border border-hairline bg-canvas px-2.5 py-2 text-[13px] outline-none focus:border-accent"
            />
          ) : (
            <button
              onClick={() => setAddingSection(true)}
              className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-2 text-[13px] text-ink-tertiary transition-colors hover:bg-surface-hover hover:text-ink-secondary"
            >
              <Plus size={15} /> Agregar sección
            </button>
          )}
        </div>
      </div>

      <DragOverlay>{activeTask ? <TaskCard task={activeTask} dragging /> : null}</DragOverlay>
    </DndContext>
  );
}

function Column({
  id,
  name,
  tasks,
  projectId,
}: {
  id: string;
  name: string;
  tasks: TaskWithTags[];
  projectId: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${id}` });
  return (
    <div className="flex w-[280px] shrink-0 flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="text-[13px] font-semibold text-ink">{name}</span>
        <span className="text-2xs text-ink-tertiary">{tasks.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[80px] flex-1 flex-col gap-2 rounded-xl p-1 transition-colors",
          isOver && "bg-surface"
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((t) => (
            <SortableCard key={t.id} task={t} />
          ))}
        </SortableContext>
        <AddTaskInline projectId={projectId} sectionId={id === NONE ? null : id} order={tasks.length} />
      </div>
    </div>
  );
}

function SortableCard({ task }: { task: TaskWithTags }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });
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

function AddTaskInline({
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
  const [open, setOpen] = useState(false);
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

  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] text-ink-tertiary transition-colors hover:bg-surface-hover hover:text-ink-secondary"
      >
        <Plus size={14} /> Agregar tarea
      </button>
    );

  return (
    <textarea
      autoFocus
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      onBlur={() => {
        submit();
        setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          submit();
        }
        if (e.key === "Escape") setOpen(false);
      }}
      rows={2}
      placeholder="Título de la tarea…"
      className="w-full resize-none rounded-lg border border-hairline bg-canvas p-2.5 text-[13px] shadow-card outline-none focus:border-accent"
    />
  );
}
