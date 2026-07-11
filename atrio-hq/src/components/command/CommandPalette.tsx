"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  Home,
  ListChecks,
  CalendarDays,
  CalendarClock,
  Plus,
  FileText,
  Hash,
  Folder,
  CheckSquare,
  MessageSquare,
  UserRoundCog,
  Settings,
} from "lucide-react";
import { useUI } from "@/stores/ui";
import { useIdentity } from "@/stores/identity";
import { useProjects } from "@/hooks/projects";
import { useChannels } from "@/hooks/chat";
import { useDocs, useCreateDoc } from "@/hooks/docs";
import { useSearch } from "@/hooks/search";

export function CommandPalette() {
  const open = useUI((s) => s.commandOpen);
  const setOpen = useUI((s) => s.setCommandOpen);
  const openPeek = useUI((s) => s.openPeek);
  const clearIdentity = useIdentity((s) => s.clear);
  const router = useRouter();

  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const match = (t: string) => t.toLowerCase().includes(q);

  const { data: projects } = useProjects();
  const { data: channels } = useChannels();
  const { data: docs } = useDocs();
  const createDoc = useCreateDoc();
  const { data: search } = useSearch(query);

  function run(fn: () => void) {
    setOpen(false);
    setQuery("");
    fn();
  }

  async function newDoc() {
    const doc = await createDoc.mutateAsync({});
    router.push(`/docs/${doc.id}`);
  }

  const fProjects = (projects ?? []).filter((p) => !q || match(p.name));
  const fChannels = (channels ?? []).filter((c) => !q || match(c.name));
  // docs por título (cache local) + docs por CONTENIDO (search_docs), sin duplicar
  const titleDocs = (docs ?? []).filter((d) => !q || match(d.title));
  const contentDocs = q ? (search?.docs ?? []).filter((d) => !titleDocs.some((t) => t.id === d.id)) : [];
  const fDocs = [...titleDocs.slice(0, 8), ...contentDocs];

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Paleta de comandos"
      shouldFilter={false}
      className="cmdk-root"
      loop
    >
      <div className="border-b border-hairline px-3">
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder="Buscar o ejecutar una acción…"
          className="h-12 w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-tertiary"
        />
      </div>
      <Command.List className="max-h-[52vh] overflow-y-auto p-1.5">
        <Command.Empty className="px-3 py-8 text-center text-[13px] text-ink-tertiary">
          Nada por acá. Probá con otra cosa 🤔
        </Command.Empty>

        <Command.Group heading="Acciones" className="cmdk-group">
          <Item value="act-new-task" icon={<Plus size={15} />} onSelect={() => run(() => openPeek({ kind: "new-task" }))}>
            Nueva tarea
          </Item>
          <Item value="act-new-doc" icon={<FileText size={15} />} onSelect={() => run(newDoc)}>
            Nuevo doc
          </Item>
          <Item value="nav-home" icon={<Home size={15} />} onSelect={() => run(() => router.push("/"))}>
            Ir a Inicio
          </Item>
          <Item value="nav-mytasks" icon={<ListChecks size={15} />} onSelect={() => run(() => router.push("/mis-tareas"))}>
            Ir a Mis Tareas
          </Item>
          <Item value="nav-agenda" icon={<CalendarClock size={15} />} onSelect={() => run(() => router.push("/agenda"))}>
            Ir a la Agenda
          </Item>
          <Item value="nav-cal" icon={<CalendarDays size={15} />} onSelect={() => run(() => router.push("/calendario"))}>
            Ir al Calendario
          </Item>
          <Item value="nav-config" icon={<Settings size={15} />} onSelect={() => run(() => router.push("/configuracion"))}>
            Ir a Configuración
          </Item>
          <Item value="act-switch" icon={<UserRoundCog size={15} />} onSelect={() => run(clearIdentity)}>
            Cambiar de persona
          </Item>
        </Command.Group>

        {fProjects.length > 0 && (
          <Command.Group heading="Proyectos" className="cmdk-group">
            {fProjects.map((p) => (
              <Item key={p.id} value={`proj-${p.id}`} icon={<span>{p.emoji}</span>} onSelect={() => run(() => router.push(`/proyectos/${p.id}`))}>
                {p.name}
              </Item>
            ))}
          </Command.Group>
        )}

        {fChannels.length > 0 && (
          <Command.Group heading="Canales" className="cmdk-group">
            {fChannels.map((c) => (
              <Item key={c.id} value={`chan-${c.id}`} icon={<span>{c.emoji}</span>} onSelect={() => run(() => router.push(`/chat/${c.id}`))}>
                {c.name}
              </Item>
            ))}
          </Command.Group>
        )}

        {fDocs.length > 0 && (
          <Command.Group heading="Docs" className="cmdk-group">
            {fDocs.map((d) => (
              <Item key={d.id} value={`doc-${d.id}`} icon={<span>{d.icon}</span>} onSelect={() => run(() => router.push(`/docs/${d.id}`))}>
                {d.title || "Sin título"}
              </Item>
            ))}
          </Command.Group>
        )}

        {q && search && search.tasks.length > 0 && (
          <Command.Group heading="Tareas" className="cmdk-group">
            {search.tasks.map((t) => (
              <Item key={t.id} value={`task-${t.id}`} icon={<CheckSquare size={15} />} onSelect={() => run(() => openPeek({ kind: "task", id: t.id }))}>
                {t.title}
              </Item>
            ))}
          </Command.Group>
        )}

        {q && search && search.messages.length > 0 && (
          <Command.Group heading="Mensajes" className="cmdk-group">
            {search.messages.map((m) => (
              <Item
                key={m.id}
                value={`msg-${m.id}`}
                icon={<MessageSquare size={15} />}
                onSelect={() => run(() => m.channel_id && router.push(`/chat/${m.channel_id}`))}
              >
                <span className="truncate">{m.body}</span>
              </Item>
            ))}
          </Command.Group>
        )}
      </Command.List>
    </Command.Dialog>
  );
}

function Item({
  children,
  onSelect,
  icon,
  value,
}: {
  children: React.ReactNode;
  onSelect: () => void;
  icon?: React.ReactNode;
  value: string;
}) {
  return (
    <Command.Item value={value} onSelect={onSelect} className="cmdk-item">
      <span className="flex h-4 w-4 items-center justify-center text-ink-secondary">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </Command.Item>
  );
}
