"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  ListChecks,
  CalendarDays,
  Search,
  Plus,
  ChevronDown,
  Hash,
  Folder,
  FileText,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUI } from "@/stores/ui";
import { useIdentity } from "@/stores/identity";
import { useProjects } from "@/hooks/projects";
import { useChannels, useUnread } from "@/hooks/chat";
import { useCreateDoc } from "@/hooks/docs";
import { Kbd } from "@/components/ui/Kbd";
import { UserChip } from "./UserChip";
import { DocTree } from "./DocTree";
import { NewProjectDialog } from "@/components/projects/NewProjectDialog";
import { NewChannelDialog } from "@/components/chat/NewChannelDialog";

function SidebarInner() {
  const pathname = usePathname();
  const router = useRouter();
  const setCommandOpen = useUI((s) => s.setCommandOpen);
  const setMobileNav = useUI((s) => s.setMobileNav);
  const me = useIdentity((s) => s.profileId);

  const { data: projects } = useProjects();
  const { data: channels } = useChannels();
  const { data: unread } = useUnread(me);
  const createDoc = useCreateDoc();

  const [newProject, setNewProject] = useState(false);
  const [newChannel, setNewChannel] = useState(false);

  const close = () => setMobileNav(false);
  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + "/");

  async function addRootDoc() {
    const doc = await createDoc.mutateAsync({});
    router.push(`/docs/${doc.id}`);
    close();
  }

  return (
    <div className="flex h-full flex-col">
      {/* header + user */}
      <div className="px-2.5 pt-2.5">
        <UserChip />
      </div>

      {/* buscar */}
      <div className="px-2.5 pt-1.5">
        <button
          onClick={() => setCommandOpen(true)}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] text-ink-secondary transition-colors hover:bg-surface-hover"
        >
          <Search size={15} />
          <span className="flex-1 text-left">Buscar…</span>
          <Kbd>⌘K</Kbd>
        </button>
      </div>

      <nav className="mt-1 flex-1 overflow-y-auto px-2.5 pb-6">
        <div className="space-y-px py-1">
          <NavItem href="/" icon={<Home size={16} />} label="Inicio" active={pathname === "/"} onClick={close} />
          <NavItem
            href="/mis-tareas"
            icon={<ListChecks size={16} />}
            label="Mis Tareas"
            active={isActive("/mis-tareas")}
            onClick={close}
          />
          <NavItem
            href="/calendario"
            icon={<CalendarDays size={16} />}
            label="Calendario"
            active={isActive("/calendario")}
            onClick={close}
          />
        </div>

        <Group
          label="Proyectos"
          onAdd={() => setNewProject(true)}
          onHeaderClick={() => {
            router.push("/proyectos");
            close();
          }}
        >
          {(projects ?? []).map((p) => (
            <SideRow
              key={p.id}
              active={isActive(`/proyectos/${p.id}`)}
              emoji={p.emoji}
              label={p.name}
              onClick={() => {
                router.push(`/proyectos/${p.id}`);
                close();
              }}
            />
          ))}
          {projects?.length === 0 && <Empty icon={<Folder size={13} />} text="Sin proyectos" />}
        </Group>

        <Group
          label="Canales"
          onAdd={() => setNewChannel(true)}
          onHeaderClick={() => {
            router.push("/chat");
            close();
          }}
        >
          {(channels ?? []).map((c) => {
            const count = unread?.[c.id] ?? 0;
            return (
              <SideRow
                key={c.id}
                active={isActive(`/chat/${c.id}`)}
                emoji={c.emoji}
                label={c.name}
                muted={c.kind === "dm"}
                badge={count > 0 ? <UnreadDot count={count} /> : undefined}
                bold={count > 0}
                onClick={() => {
                  router.push(`/chat/${c.id}`);
                  close();
                }}
              />
            );
          })}
          {channels?.length === 0 && <Empty icon={<MessageSquare size={13} />} text="Sin canales" />}
        </Group>

        <Group
          label="Docs"
          onAdd={addRootDoc}
          onHeaderClick={() => {
            router.push("/docs");
            close();
          }}
        >
          <DocTree onNavigate={close} />
        </Group>
      </nav>

      <NewProjectDialog open={newProject} onOpenChange={setNewProject} />
      <NewChannelDialog open={newChannel} onOpenChange={setNewChannel} />
    </div>
  );
}

export function Sidebar() {
  const collapsed = useUI((s) => s.sidebarCollapsed);
  const mobileOpen = useUI((s) => s.mobileNavOpen);
  const setMobileNav = useUI((s) => s.setMobileNav);

  return (
    <>
      <aside
        className={cn(
          "hidden shrink-0 border-r border-hairline bg-surface transition-[width] duration-200 md:flex md:flex-col",
          collapsed ? "md:w-0 md:overflow-hidden md:opacity-0" : "md:w-[264px]"
        )}
      >
        <SidebarInner />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 animate-overlay-in bg-ink/25" onClick={() => setMobileNav(false)} />
          <div className="absolute left-0 top-0 h-full w-[284px] animate-slide-in-right border-r border-hairline bg-surface shadow-float">
            <SidebarInner />
          </div>
        </div>
      )}
    </>
  );
}

function NavItem({
  href,
  icon,
  label,
  active,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors",
        active ? "bg-surface-active text-ink" : "text-ink-secondary hover:bg-surface-hover hover:text-ink"
      )}
    >
      <span className={cn(active ? "text-ink" : "text-ink-tertiary")}>{icon}</span>
      <span className="flex-1 truncate">{label}</span>
    </Link>
  );
}

function Group({
  label,
  children,
  onAdd,
  onHeaderClick,
}: {
  label: string;
  children: React.ReactNode;
  onAdd?: () => void;
  onHeaderClick?: () => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mt-4">
      <div className="group/head flex items-center gap-1 px-1">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1 rounded px-1 py-0.5 text-2xs font-semibold uppercase tracking-wide text-ink-tertiary transition-colors hover:text-ink-secondary"
        >
          <ChevronDown size={12} className={cn("transition-transform", !open && "-rotate-90")} />
          <span onClick={(e) => { if (onHeaderClick) { e.stopPropagation(); onHeaderClick(); } }}>{label}</span>
        </button>
        <div className="flex-1" />
        {onAdd && (
          <button
            onClick={onAdd}
            className="icon-btn h-5 w-5 opacity-0 group-hover/head:opacity-100"
            title={`Agregar en ${label}`}
          >
            <Plus size={14} />
          </button>
        )}
      </div>
      {open && <div className="mt-0.5 space-y-px">{children}</div>}
    </div>
  );
}

function SideRow({
  emoji,
  label,
  active,
  badge,
  muted,
  bold,
  onClick,
}: {
  emoji?: string;
  label: string;
  active?: boolean;
  badge?: React.ReactNode;
  muted?: boolean;
  bold?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors",
        active ? "bg-surface-active text-ink" : "text-ink-secondary hover:bg-surface-hover hover:text-ink"
      )}
    >
      <span className="shrink-0 text-sm leading-none">{emoji}</span>
      <span className={cn("flex-1 truncate", bold ? "font-semibold text-ink" : muted && "text-ink-secondary")}>
        {label}
      </span>
      {badge}
    </button>
  );
}

function UnreadDot({ count }: { count: number }) {
  return (
    <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-fg">
      {count > 9 ? "9+" : count}
    </span>
  );
}

function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 text-2xs text-ink-tertiary">
      {icon}
      {text}
    </div>
  );
}
