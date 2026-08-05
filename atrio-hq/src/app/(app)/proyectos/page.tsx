"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Archive, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useProjects, useArchivedProjects, useArchiveProject } from "@/hooks/projects";
import { useAllTasks } from "@/hooks/tasks";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { NewProjectDialog } from "@/components/projects/NewProjectDialog";

export default function ProjectsIndex() {
  const router = useRouter();
  const { data: projects, isLoading } = useProjects();
  const { data: archived } = useArchivedProjects();
  const { data: tasks } = useAllTasks();
  const archive = useArchiveProject();
  const [newOpen, setNewOpen] = useState(false);

  function counts(projectId: string) {
    const list = (tasks ?? []).filter((t) => t.project_id === projectId);
    return { total: list.length, done: list.filter((t) => t.status === "done").length };
  }

  return (
    <div className="h-full overflow-y-auto">
      <header className="flex items-center gap-3 border-b border-hairline px-6 py-3">
        <h1 className="text-lg font-semibold tracking-tight">Proyectos</h1>
        <div className="flex-1" />
        <Button variant="primary" size="sm" onClick={() => setNewOpen(true)}>
          <Plus size={15} /> Nuevo proyecto
        </Button>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-6">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : projects?.length === 0 ? (
          <EmptyState
            emoji="🗂️"
            title="Todavía no hay proyectos"
            hint="Arrancá creando el primero para organizar el trabajo del estudio."
            action={
              <Button variant="primary" size="sm" onClick={() => setNewOpen(true)}>
                <Plus size={15} /> Crear proyecto
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {projects?.map((p) => {
              const c = counts(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => router.push(`/proyectos/${p.id}`)}
                  className="group flex flex-col gap-2 rounded-xl border border-hairline bg-canvas p-4 text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-hairline-strong hover:shadow-subtle"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{p.emoji}</span>
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-ink">{p.name}</div>
                      {p.client_name && <div className="truncate text-2xs text-ink-secondary">{p.client_name}</div>}
                    </div>
                  </div>
                  {p.description && <p className="line-clamp-2 text-[13px] text-ink-secondary">{p.description}</p>}
                  <div className="mt-1 flex items-center gap-2 text-2xs text-ink-tertiary">
                    <span className="tnum">
                      {c.done}/{c.total} tareas
                    </span>
                    {c.total > 0 && (
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-active">
                        <div
                          className="h-full rounded-full bg-priority-medium transition-all"
                          style={{ width: `${(c.done / c.total) * 100}%`, background: "#4FA373" }}
                        />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* archivados: no se pierden, se recuperan de a un toque */}
        {(archived ?? []).length > 0 && (
          <details className="mt-8">
            <summary className="flex cursor-pointer items-center gap-2 px-1 py-1 text-2xs font-semibold uppercase tracking-wide text-ink-tertiary transition-colors hover:text-ink-secondary">
              <Archive size={13} />
              Archivados
              <span className="tnum">({archived!.length})</span>
            </summary>
            <div className="mt-2 space-y-1">
              {archived!.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2.5 rounded-lg border border-hairline bg-canvas px-3 py-2"
                >
                  <span className="text-lg opacity-60">{p.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-ink-secondary">{p.name}</div>
                    {p.client_name && <div className="truncate text-2xs text-ink-tertiary">{p.client_name}</div>}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      await archive.mutateAsync({ id: p.id, name: p.name, archived: false });
                      toast.success(`“${p.name}” restaurado`);
                    }}
                  >
                    <RotateCcw size={14} /> Restaurar
                  </Button>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
      <NewProjectDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}
