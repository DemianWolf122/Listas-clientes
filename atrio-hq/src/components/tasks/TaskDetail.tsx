"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal, Trash2, ExternalLink, Plus, CornerDownRight } from "lucide-react";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/Menu";
import { Avatar } from "@/components/ui/Avatar";
import { Spinner } from "@/components/ui/Spinner";
import {
  StatusCheckbox,
  AssigneeControl,
  DeadlineControl,
  ScheduleControl,
  PriorityControl,
  TagControl,
  TagChips,
} from "./controls";
import {
  useTask,
  useSubtasks,
  useUpdateTask,
  useToggleTask,
  useDeleteTask,
  useCreateTask,
} from "@/hooks/tasks";
import { useToggleTaskTag } from "@/hooks/tags";
import { useComments, useAddComment } from "@/hooks/comments";
import { useProfileMap, useCurrentProfile, useOther } from "@/hooks/profiles";
import { usePrefs } from "@/stores/ui";
import { useAnnounceViewing } from "@/components/providers/PresenceProvider";
import { playChime } from "@/lib/sound";
import { fireConfetti } from "@/lib/confetti";
import { relativeTime, timeOfDay } from "@/lib/utils";

export function TaskDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const router = useRouter();
  const { data: task, isLoading } = useTask(id);
  const { data: subtasks } = useSubtasks(id);
  const update = useUpdateTask();
  const toggle = useToggleTask();
  const del = useDeleteTask();
  const createTask = useCreateTask();
  const removeTag = useToggleTaskTag();
  const me = useCurrentProfile();
  const other = useOther();
  const profileMap = useProfileMap();
  const { sounds, celebrate } = usePrefs();

  const { data: comments } = useComments("task", id);
  const addComment = useAddComment();

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [newSub, setNewSub] = useState("");
  const [comment, setComment] = useState("");

  useAnnounceViewing(task ? `la tarea “${task.title}”` : null);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDesc(task.description ?? "");
    }
  }, [task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading || !task) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const done = task.status === "done";

  function commitTitle() {
    if (title.trim() && title !== task!.title) update.mutate({ id, title: title.trim() });
  }
  function commitDesc() {
    if (desc !== (task!.description ?? "")) update.mutate({ id, description: desc });
  }
  function onToggleDone() {
    const willBeDone = !done;
    toggle.mutate({ task: task!, done: willBeDone });
    if (willBeDone) {
      if (celebrate) fireConfetti();
      if (sounds) playChime();
    }
  }
  async function addSubtask() {
    if (!newSub.trim()) return;
    await createTask.mutateAsync({
      title: newSub.trim(),
      parent_task_id: id,
      project_id: task!.project_id,
      assignee_id: task!.assignee_id,
    });
    setNewSub("");
  }
  async function submitComment() {
    if (!comment.trim()) return;
    await addComment.mutateAsync({
      targetType: "task",
      targetId: id,
      body: comment.trim(),
      recipientId: other?.id ?? null,
    });
    setComment("");
  }

  return (
    <div className="flex h-full flex-col">
      {/* header */}
      <div className="flex items-center gap-2 border-b border-hairline px-4 py-2.5">
        {task.project && (
          <button
            onClick={() => {
              if (task.project_id) router.push(`/proyectos/${task.project_id}`);
              onClose();
            }}
            className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-2xs text-ink-secondary transition-colors hover:bg-surface-hover"
          >
            <span>{task.project.emoji}</span>
            {task.project.name}
          </button>
        )}
        <div className="flex-1" />
        <Menu>
          <MenuTrigger asChild>
            <button className="icon-btn">
              <MoreHorizontal size={16} />
            </button>
          </MenuTrigger>
          <MenuContent>
            {task.project_id && (
              <MenuItem
                onSelect={() => {
                  router.push(`/proyectos/${task.project_id}`);
                  onClose();
                }}
              >
                <ExternalLink size={14} /> Ir al proyecto
              </MenuItem>
            )}
            <MenuItem
              danger
              onSelect={() => {
                del.mutate(id);
                toast("Tarea eliminada");
                onClose();
              }}
            >
              <Trash2 size={14} /> Eliminar tarea
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* título */}
        <div className="flex items-start gap-3 px-5 pt-5">
          <div className="pt-1">
            <StatusCheckbox checked={done} onToggle={onToggleDone} size={22} />
          </div>
          <textarea
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.target as HTMLTextAreaElement).blur();
              }
            }}
            rows={1}
            className="w-full resize-none border-none bg-transparent text-xl font-semibold leading-snug text-ink outline-none placeholder:text-ink-tertiary"
            style={{ textDecoration: done ? "line-through" : undefined }}
            placeholder="Título de la tarea"
          />
        </div>

        {/* propiedades */}
        <div className="mt-3 space-y-0.5 px-5">
          <Prop label="Responsable">
            <AssigneeControl
              value={task.assignee_id}
              onChange={(v) => update.mutate({ id, assignee_id: v, notifyAssignee: true })}
            />
          </Prop>
          <Prop label="Entrega">
            <DeadlineControl
              date={task.due_date}
              time={task.due_time}
              onChange={(v) => update.mutate({ id, due_date: v.date, due_time: v.time })}
            />
          </Prop>
          <Prop label="Agenda">
            <ScheduleControl
              date={task.start_date}
              start={task.start_time}
              end={task.end_time}
              onChange={(v) => update.mutate({ id, start_date: v.date, start_time: v.start, end_time: v.end })}
            />
          </Prop>
          <Prop label="Prioridad">
            <PriorityControl value={task.priority} onChange={(v) => update.mutate({ id, priority: v })} />
          </Prop>
          <Prop label="Etiquetas">
            <div className="flex flex-wrap items-center gap-1.5">
              <TagChips tags={task.tags} onRemove={(tagId) => removeTag.mutate({ taskId: id, tagId, on: false })} />
              <TagControl taskId={id} current={task.tags} />
            </div>
          </Prop>
        </div>

        {/* descripción */}
        <div className="mt-4 px-5">
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            onBlur={commitDesc}
            placeholder="Agregá una descripción…"
            rows={3}
            className="w-full resize-none rounded-lg border border-transparent bg-transparent px-0 py-1 text-[14px] leading-relaxed text-ink outline-none transition placeholder:text-ink-tertiary focus:border-hairline focus:bg-surface/40 focus:px-2"
          />
        </div>

        {/* subtareas */}
        <div className="mt-4 px-5">
          <div className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-tertiary">
            Subtareas {subtasks && subtasks.length > 0 && `· ${subtasks.filter((s) => s.status === "done").length}/${subtasks.length}`}
          </div>
          <div className="space-y-0.5">
            {subtasks?.map((s) => (
              <div key={s.id} className="group flex items-center gap-2.5 rounded-md px-1 py-1 hover:bg-surface-hover">
                <StatusCheckbox
                  checked={s.status === "done"}
                  onToggle={() => toggle.mutate({ task: s, done: s.status !== "done" })}
                  size={16}
                />
                <span className={`flex-1 text-[13px] ${s.status === "done" ? "text-ink-tertiary line-through" : "text-ink"}`}>
                  {s.title}
                </span>
                <button
                  onClick={() => del.mutate(s.id)}
                  className="icon-btn h-6 w-6 touch-reveal"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-1 flex items-center gap-2 px-1">
            <CornerDownRight size={14} className="text-ink-tertiary" />
            <input
              value={newSub}
              onChange={(e) => setNewSub(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSubtask()}
              placeholder="Agregar subtarea"
              className="flex-1 bg-transparent py-1 text-[13px] outline-none placeholder:text-ink-tertiary"
            />
          </div>
        </div>

        {/* comentarios */}
        <div className="mt-5 border-t border-hairline px-5 py-4">
          <div className="mb-2 text-2xs font-semibold uppercase tracking-wide text-ink-tertiary">
            Comentarios
          </div>
          <div className="space-y-3">
            {comments?.map((c) => {
              const author = c.author_id ? profileMap[c.author_id] : undefined;
              return (
                <div key={c.id} className="flex gap-2.5">
                  <Avatar profile={author} size={26} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[13px] font-medium text-ink">{author?.name ?? "Alguien"}</span>
                      <span className="text-2xs text-ink-tertiary">{relativeTime(c.created_at)}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-[13px] text-ink">{c.body}</p>
                  </div>
                </div>
              );
            })}
            {comments?.length === 0 && (
              <p className="text-[13px] text-ink-tertiary">Todavía no hay comentarios.</p>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <Avatar profile={me} size={26} />
            <div className="flex-1">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitComment();
                }}
                placeholder="Escribí un comentario… (⌘↵ para enviar)"
                rows={2}
                className="w-full resize-none rounded-lg border border-hairline bg-canvas px-2.5 py-2 text-[13px] outline-none focus:border-accent"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Prop({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-0.5">
      <span className="w-24 shrink-0 text-[13px] text-ink-tertiary">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
