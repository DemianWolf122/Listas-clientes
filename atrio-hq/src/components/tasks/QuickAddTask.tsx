"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, FolderOpen } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { Button } from "@/components/ui/Button";
import { AssigneeControl, DeadlineControl, ScheduleControl, PriorityControl } from "./controls";
import { useProjects } from "@/hooks/projects";
import { useCreateTask } from "@/hooks/tasks";
import { useIdentity } from "@/stores/identity";
import type { Priority } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function QuickAddTask({
  projectId,
  sectionId,
  prefillTitle,
  onDone,
}: {
  projectId?: string;
  sectionId?: string;
  prefillTitle?: string;
  onDone: () => void;
}) {
  const me = useIdentity((s) => s.profileId);
  const { data: projects } = useProjects();
  const create = useCreateTask();

  const [title, setTitle] = useState(prefillTitle ?? "");
  const [project, setProject] = useState<string | null>(projectId ?? null);
  const [assignee, setAssignee] = useState<string | null>(me);
  const [due, setDue] = useState<string | null>(null);
  const [dueTime, setDueTime] = useState<string | null>(null);
  const [sched, setSched] = useState<{ date: string | null; start: string | null; end: string | null }>({
    date: null,
    start: null,
    end: null,
  });
  const [priority, setPriority] = useState<Priority>("none");

  async function submit() {
    if (!title.trim()) return;
    await create.mutateAsync({
      title: title.trim(),
      project_id: project,
      section_id: sectionId ?? null,
      assignee_id: assignee,
      due_date: due,
      due_time: dueTime,
      start_date: sched.date,
      start_time: sched.start,
      end_time: sched.end,
      priority,
    });
    toast.success("Tarea creada ✍️");
    onDone();
  }

  const currentProject = projects?.find((p) => p.id === project);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-hairline px-5 py-4">
        <h2 className="text-sm font-semibold text-ink">Nueva tarea</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        <textarea
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="¿Qué hay que hacer?"
          rows={2}
          className="w-full resize-none border-none bg-transparent text-lg font-medium text-ink outline-none placeholder:text-ink-tertiary"
        />

        <div className="mt-4 space-y-1 border-t border-hairline pt-4">
          <Field label="Proyecto">
            <ProjectPicker
              projects={projects ?? []}
              value={project}
              onChange={setProject}
              currentName={currentProject?.name}
              currentEmoji={currentProject?.emoji}
            />
          </Field>
          <Field label="Responsable">
            <AssigneeControl value={assignee} onChange={setAssignee} />
          </Field>
          <Field label="Entrega">
            <DeadlineControl
              date={due}
              time={dueTime}
              onChange={(v) => {
                setDue(v.date);
                setDueTime(v.time);
              }}
            />
          </Field>
          <Field label="Agenda">
            <ScheduleControl date={sched.date} start={sched.start} end={sched.end} onChange={setSched} />
          </Field>
          <Field label="Prioridad">
            <PriorityControl value={priority} onChange={setPriority} />
          </Field>
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-hairline px-5 py-3">
        <Button variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={submit} disabled={!title.trim() || create.isPending}>
          Crear tarea
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-[13px] text-ink-tertiary">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function ProjectPicker({
  projects,
  value,
  onChange,
  currentName,
  currentEmoji,
}: {
  projects: { id: string; name: string; emoji: string }[];
  value: string | null;
  onChange: (v: string | null) => void;
  currentName?: string;
  currentEmoji?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[13px] transition-colors hover:bg-surface-hover">
          {value ? (
            <>
              <span>{currentEmoji}</span>
              <span className="text-ink">{currentName}</span>
            </>
          ) : (
            <>
              <FolderOpen size={15} className="text-ink-tertiary" />
              <span className="text-ink-secondary">Sin proyecto</span>
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px]">
        <button
          onClick={() => { onChange(null); setOpen(false); }}
          className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-surface-hover")}
        >
          <FolderOpen size={15} className="text-ink-tertiary" />
          <span className="flex-1">Sin proyecto</span>
          {!value && <Check size={14} className="text-ink-secondary" />}
        </button>
        {projects.map((p) => (
          <button
            key={p.id}
            onClick={() => { onChange(p.id); setOpen(false); }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-surface-hover"
          >
            <span>{p.emoji}</span>
            <span className="flex-1 truncate">{p.name}</span>
            {value === p.id && <Check size={14} className="text-ink-secondary" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
