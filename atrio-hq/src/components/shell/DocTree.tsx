"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, Plus } from "lucide-react";
import { useDocs, useCreateDoc, type DocNode } from "@/hooks/docs";
import { groupBy, cn } from "@/lib/utils";

export function DocTree({ onNavigate }: { onNavigate?: () => void }) {
  const { data: docs } = useDocs();
  const pathname = usePathname();
  const router = useRouter();
  const createDoc = useCreateDoc();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const activeId = pathname?.startsWith("/docs/") ? pathname.split("/")[2] : undefined;
  const byParent = useMemo(
    () => groupBy(docs ?? [], (d) => d.parent_doc_id ?? "root"),
    [docs]
  );

  // auto-expandir ancestros del doc activo
  useEffect(() => {
    if (!activeId || !docs) return;
    const map: Record<string, DocNode> = {};
    docs.forEach((d) => (map[d.id] = d));
    const chain = new Set<string>();
    let cur = map[activeId]?.parent_doc_id;
    while (cur) {
      chain.add(cur);
      cur = map[cur]?.parent_doc_id ?? null;
    }
    if (chain.size) setExpanded((prev) => new Set([...prev, ...chain]));
  }, [activeId, docs]);

  async function addChild(parentId: string | null, projectId: string | null) {
    const doc = await createDoc.mutateAsync({ parent_doc_id: parentId, project_id: projectId });
    if (parentId) setExpanded((prev) => new Set([...prev, parentId]));
    router.push(`/docs/${doc.id}`);
    onNavigate?.();
  }

  function renderLevel(parentKey: string, depth: number): React.ReactNode {
    const nodes = byParent[parentKey] ?? [];
    if (!nodes.length && parentKey === "root") {
      return <p className="px-2 py-1 text-2xs text-ink-tertiary">Sin páginas todavía</p>;
    }
    return nodes.map((node) => {
      const children = byParent[node.id] ?? [];
      const isOpen = expanded.has(node.id);
      const isActive = node.id === activeId;
      return (
        <div key={node.id}>
          <div
            className={cn(
              "group/row flex items-center gap-0.5 rounded-md pr-1 transition-colors",
              isActive ? "bg-surface-active" : "hover:bg-surface-hover"
            )}
            style={{ paddingLeft: depth * 12 }}
          >
            <button
              onClick={() =>
                setExpanded((prev) => {
                  const next = new Set(prev);
                  next.has(node.id) ? next.delete(node.id) : next.add(node.id);
                  return next;
                })
              }
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded text-ink-tertiary transition-transform hover:bg-surface-active",
                children.length === 0 && "invisible"
              )}
            >
              <ChevronRight size={13} className={cn("transition-transform", isOpen && "rotate-90")} />
            </button>
            <button
              onClick={() => {
                router.push(`/docs/${node.id}`);
                onNavigate?.();
              }}
              className="flex min-w-0 flex-1 items-center gap-1.5 py-1 text-left text-[13px] text-ink"
            >
              <span className="shrink-0 text-sm leading-none">{node.icon}</span>
              <span className="truncate">{node.title || "Sin título"}</span>
            </button>
            <button
              onClick={() => addChild(node.id, node.project_id)}
              className="icon-btn h-5 w-5 touch-reveal"
              title="Agregar subpágina"
            >
              <Plus size={13} />
            </button>
          </div>
          {isOpen && children.length > 0 && renderLevel(node.id, depth + 1)}
        </div>
      );
    });
  }

  return <div className="space-y-px">{renderLevel("root", 0)}</div>;
}
