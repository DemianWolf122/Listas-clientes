"use client";

import { useRouter } from "next/navigation";
import { Plus, FileText } from "lucide-react";
import { useDocs, useCreateDoc } from "@/hooks/docs";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { relativeTime } from "@/lib/utils";

export default function DocsIndex() {
  const router = useRouter();
  const { data: docs, isLoading } = useDocs();
  const create = useCreateDoc();

  async function newDoc() {
    const doc = await create.mutateAsync({});
    router.push(`/docs/${doc.id}`);
  }

  const roots = (docs ?? []).filter((d) => !d.parent_doc_id);

  return (
    <div className="h-full overflow-y-auto">
      <header className="flex items-center gap-3 border-b border-hairline px-6 py-3">
        <h1 className="text-lg font-semibold tracking-tight">Docs</h1>
        <div className="flex-1" />
        <Button variant="primary" size="sm" onClick={newDoc}>
          <Plus size={15} /> Nueva página
        </Button>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-6">
        {isLoading ? (
          <SkeletonRows rows={5} />
        ) : roots.length === 0 ? (
          <EmptyState
            emoji="📝"
            title="Todavía no hay páginas"
            hint="Creá la primera para empezar a documentar clientes, ideas y procesos."
            action={
              <Button variant="primary" size="sm" onClick={newDoc}>
                <Plus size={15} /> Crear página
              </Button>
            }
          />
        ) : (
          <div className="space-y-1">
            {roots.map((d) => (
              <button
                key={d.id}
                onClick={() => router.push(`/docs/${d.id}`)}
                className="flex w-full items-center gap-3 rounded-lg border border-hairline bg-canvas px-3 py-2.5 text-left shadow-card transition-all hover:border-hairline-strong"
              >
                <span className="text-xl">{d.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-ink">{d.title || "Sin título"}</div>
                  <div className="text-2xs text-ink-tertiary">Editado {relativeTime(d.updated_at)}</div>
                </div>
                <FileText size={15} className="text-ink-tertiary" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
