"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, Trash2, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useArchiveProject, useDeleteProject, useSections } from "@/hooks/projects";
import { useAllTasks } from "@/hooks/tasks";
import { useChannels } from "@/hooks/chat";
import type { Project } from "@/lib/types/database";

/**
 * Confirmación para sacar un proyecto de la app. Muestra sin vueltas qué se
 * pierde (las tareas se van con el proyecto) y ofrece archivar como salida
 * reversible, que casi siempre es lo que se quiere.
 */
export function DeleteProjectDialog({
  open,
  onOpenChange,
  project,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  project: Project | null;
}) {
  const router = useRouter();
  const archive = useArchiveProject();
  const del = useDeleteProject();
  const { data: tasks } = useAllTasks();
  const { data: sections } = useSections(project?.id);
  const { data: channels } = useChannels();

  if (!project) return null;

  const taskCount = (tasks ?? []).filter((t) => t.project_id === project.id).length;
  const sectionCount = (sections ?? []).length;
  const channel = (channels ?? []).find((c) => c.project_id === project.id);
  const working = archive.isPending || del.isPending;

  async function doArchive() {
    await archive.mutateAsync({ id: project!.id, name: project!.name, archived: true });
    toast.success(`“${project!.name}” archivado`);
    onOpenChange(false);
    router.push("/proyectos");
  }

  async function doDelete() {
    await del.mutateAsync({ id: project!.id, name: project!.name });
    toast.success(`“${project!.name}” eliminado`);
    onOpenChange(false);
    router.push("/proyectos");
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`Eliminar “${project.name}”`}
      description="Esto no se puede deshacer."
    >
      <div className="mt-4 space-y-3">
        <div className="rounded-xl border border-hairline bg-surface/60 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-priority-high" />
            <div className="min-w-0 text-[13px] leading-relaxed text-ink-secondary">
              {taskCount > 0 ? (
                <>
                  Se borran también{" "}
                  <strong className="text-ink">
                    {taskCount} {taskCount === 1 ? "tarea" : "tareas"}
                  </strong>{" "}
                  {taskCount === 1 ? "que vive" : "que viven"} en este proyecto
                  {sectionCount > 0 && <> y sus {sectionCount} secciones</>}.
                </>
              ) : (
                <>
                  El proyecto está vacío: no tiene tareas
                  {sectionCount > 0 && <>, solo {sectionCount} secciones sin contenido</>}.
                </>
              )}
            </div>
          </div>
        </div>

        {channel && (
          <p className="px-0.5 text-2xs text-ink-tertiary">
            El canal <strong className="text-ink-secondary">#{channel.name}</strong> y sus mensajes NO se borran: quedan
            en el chat, sin proyecto asociado. Lo mismo con los docs y los eventos.
          </p>
        )}

        <div className="rounded-xl border border-hairline p-3">
          <div className="flex items-start gap-2">
            <Archive size={15} className="mt-0.5 shrink-0 text-ink-tertiary" />
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-ink">¿Y si lo archivás?</p>
              <p className="mt-0.5 text-2xs leading-relaxed text-ink-secondary">
                Desaparece de la barra lateral y del listado, pero no se pierde nada y se puede recuperar.
              </p>
              <Button variant="outline" size="sm" className="mt-2" onClick={doArchive} disabled={working}>
                <Archive size={14} /> Archivar en su lugar
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-2">
        <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={working}>
          Cancelar
        </Button>
        <Button
          variant="danger"
          onClick={doDelete}
          disabled={working}
          className="bg-priority-urgent/10"
        >
          <Trash2 size={14} />
          {taskCount > 0 ? `Eliminar proyecto y ${taskCount} ${taskCount === 1 ? "tarea" : "tareas"}` : "Eliminar proyecto"}
        </Button>
      </div>
    </Modal>
  );
}
