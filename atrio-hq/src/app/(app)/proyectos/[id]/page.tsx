"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { List, Columns3, CalendarDays, Plus, MessageSquare, MoreHorizontal, Trash2, Archive } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useProject, useArchiveProject } from "@/hooks/projects";
import { useChannels } from "@/hooks/chat";
import { useUI } from "@/stores/ui";
import { useAnnounceViewing } from "@/components/providers/PresenceProvider";
import { Segmented } from "@/components/ui/Segmented";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import { Board } from "@/components/tasks/Board";
import { TaskListView } from "@/components/tasks/TaskListView";
import { CalendarView } from "@/components/calendar/CalendarView";
import { Skeleton } from "@/components/ui/Skeleton";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/Menu";
import { DeleteProjectDialog } from "@/components/projects/DeleteProjectDialog";

type View = "list" | "board" | "cal";

export default function ProjectPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { data: project, isLoading } = useProject(id);
  const { data: channels } = useChannels();
  const openPeek = useUI((s) => s.openPeek);
  const archive = useArchiveProject();
  const [view, setView] = useState<View>("board");
  const [deleteOpen, setDeleteOpen] = useState(false);

  useAnnounceViewing(project ? `el proyecto ${project.name}` : null);

  const projectChannel = channels?.find((c) => c.project_id === id);

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-hairline px-4 py-3 sm:px-6">
        {isLoading ? (
          <Skeleton className="h-6 w-40" />
        ) : (
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-xl">{project?.emoji}</span>
            <h1 className="truncate text-lg font-semibold tracking-tight text-ink">{project?.name}</h1>
            {project?.client_name && (
              <span className="hidden truncate rounded-md bg-surface px-1.5 py-0.5 text-2xs text-ink-secondary sm:inline">
                {project.client_name}
              </span>
            )}
          </div>
        )}
        <div className="flex-1" />
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: "list", label: "Lista", icon: <List size={14} /> },
            { value: "board", label: "Tablero", icon: <Columns3 size={14} /> },
            { value: "cal", label: "Calendario", icon: <CalendarDays size={14} /> },
          ]}
        />
        {projectChannel && (
          <Tooltip content="Canal del proyecto">
            <button className="icon-btn" onClick={() => router.push(`/chat/${projectChannel.id}`)}>
              <MessageSquare size={17} />
            </button>
          </Tooltip>
        )}
        <Button variant="primary" size="sm" onClick={() => openPeek({ kind: "new-task", projectId: id })}>
          <Plus size={15} /> Tarea
        </Button>
        <Menu>
          <MenuTrigger asChild>
            <button className="icon-btn" aria-label="Opciones del proyecto">
              <MoreHorizontal size={17} />
            </button>
          </MenuTrigger>
          <MenuContent>
            <MenuItem
              onSelect={async () => {
                if (!project) return;
                await archive.mutateAsync({ id: project.id, name: project.name, archived: true });
                toast.success(`“${project.name}” archivado`);
                router.push("/proyectos");
              }}
            >
              <Archive size={14} /> Archivar proyecto
            </MenuItem>
            <MenuSeparator />
            <MenuItem danger onSelect={() => setDeleteOpen(true)}>
              <Trash2 size={14} /> Eliminar proyecto
            </MenuItem>
          </MenuContent>
        </Menu>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden">
        {view === "board" && <Board projectId={id} />}
        {view === "list" && <div className="h-full overflow-y-auto"><TaskListView projectId={id} /></div>}
        {view === "cal" && <CalendarView projectId={id} />}
      </div>

      <DeleteProjectDialog open={deleteOpen} onOpenChange={setDeleteOpen} project={project ?? null} />
    </div>
  );
}
