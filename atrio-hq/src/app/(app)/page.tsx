"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, Eye, Sparkles } from "lucide-react";
import { useIdentity } from "@/stores/identity";
import { useCurrentProfile, useOther, useProfileMap } from "@/hooks/profiles";
import { usePresence, useAnnounceViewing } from "@/components/providers/PresenceProvider";
import { useMyTasks } from "@/hooks/tasks";
import { useActivity } from "@/hooks/activity";
import { useEvents } from "@/hooks/events";
import { useProjects } from "@/hooks/projects";
import { useUI } from "@/stores/ui";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusCheckbox, PriorityDot, DueChip, ScheduleChip } from "@/components/tasks/controls";
import { useToggleTask } from "@/hooks/tasks";
import { usePrefs } from "@/stores/ui";
import { fireConfetti } from "@/lib/confetti";
import { playChime } from "@/lib/sound";
import { PRESENCE } from "@/lib/constants";
import { greeting, humanDateLong, isOverdue, isDueToday, relativeTime, timeOfDay, humanDate, cn } from "@/lib/utils";

export default function HomePage() {
  const me = useIdentity((s) => s.profileId);
  const profile = useCurrentProfile();
  const other = useOther();
  const router = useRouter();
  const { everyone } = usePresence();
  const openPeek = useUI((s) => s.openPeek);

  const { data: myTasks } = useMyTasks(me);
  const { data: activity } = useActivity({ limit: 12 });
  const { data: events } = useEvents();
  const { data: projects } = useProjects();
  const profileMap = useProfileMap();

  useAnnounceViewing("el inicio");

  const today = (myTasks ?? []).filter(
    (t) => t.status !== "done" && (isDueToday(t.due_date) || isOverdue(t.due_date, t.status))
  );
  const upcomingEvents = (events ?? [])
    .filter((e) => new Date(e.starts_at) >= new Date(new Date().toDateString()))
    .slice(0, 5);
  const otherMeta = other ? everyone[other.id] : undefined;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8 sm:py-8">
        {/* saludo */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-balance">
              {greeting()}, {profile?.name} 👋
            </h1>
            <p className="mt-0.5 text-sm text-ink-secondary first-letter:uppercase">{humanDateLong(new Date())}</p>
          </div>
          {other && <PresenceCard other={other} meta={otherMeta} />}
        </div>

        {/* grid */}
        <div className="mt-7 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Hoy */}
          <Card title="Hoy" className="lg:col-span-2" accent="☀️">
            {today.length === 0 ? (
              <EmptyState emoji="🎉" title="¡Nada urgente para hoy!" hint="Estás al día. Buen momento para adelantar algo." className="py-8" />
            ) : (
              <div className="space-y-0.5">
                {today.map((t) => (
                  <HomeTaskRow key={t.id} task={t} />
                ))}
              </div>
            )}
          </Card>

          {/* Próximos eventos */}
          <Card title="Próximos eventos" accent="📅">
            {upcomingEvents.length === 0 ? (
              <p className="px-1 py-4 text-[13px] text-ink-tertiary">No hay eventos agendados.</p>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => router.push("/calendario")}
                    className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-surface-hover"
                  >
                    <span className="h-8 w-1 shrink-0 rounded-full" style={{ background: e.color ?? "#8E7CC3" }} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium text-ink">{e.title}</div>
                      <div className="flex items-center gap-1 text-2xs text-ink-secondary">
                        <CalendarDays size={11} />
                        <span className="capitalize">{humanDate(e.starts_at)}</span>
                        {!e.all_day && <span className="tnum">· {timeOfDay(e.starts_at)}</span>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* Actividad */}
          <Card title="Actividad reciente" className="lg:col-span-2" accent="📣">
            {(activity ?? []).length === 0 ? (
              <p className="px-1 py-4 text-[13px] text-ink-tertiary">Todavía no pasó nada. ¡Arranquemos! ✍️</p>
            ) : (
              <div className="space-y-2.5">
                {activity?.map((a) => {
                  const actor = a.actor_id ? profileMap[a.actor_id] : undefined;
                  return (
                    <div key={a.id} className="flex items-center gap-2.5">
                      <Avatar profile={actor} size={22} />
                      <p className="min-w-0 flex-1 truncate text-[13px] text-ink-secondary">
                        <span className="font-medium text-ink">{actor?.name ?? "Alguien"}</span> {verbText(a.verb)}{" "}
                        <span className="text-ink">{(a.metadata as any)?.title ?? (a.metadata as any)?.name ?? a.target_type}</span>
                      </p>
                      <span className="shrink-0 text-2xs text-ink-tertiary">{relativeTime(a.created_at)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Proyectos */}
          <Card title="Proyectos" accent="🗂️" onTitle={() => router.push("/proyectos")}>
            <div className="space-y-0.5">
              {projects?.slice(0, 6).map((p) => (
                <button
                  key={p.id}
                  onClick={() => router.push(`/proyectos/${p.id}`)}
                  className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-surface-hover"
                >
                  <span className="text-base">{p.emoji}</span>
                  <span className="flex-1 truncate text-[13px] text-ink">{p.name}</span>
                  <ArrowRight size={13} className="text-ink-tertiary opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              ))}
              {projects?.length === 0 && <p className="px-1 py-3 text-[13px] text-ink-tertiary">Sin proyectos todavía.</p>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function verbText(verb: string) {
  return { created: "creó", completed: "completó", commented: "comentó", edited: "editó" }[verb] ?? verb;
}

function Card({
  title,
  children,
  className,
  accent,
  onTitle,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  accent?: string;
  onTitle?: () => void;
}) {
  return (
    <section className={cn("rounded-2xl border border-hairline bg-canvas p-4 shadow-card", className)}>
      <button
        onClick={onTitle}
        disabled={!onTitle}
        className={cn("mb-2.5 flex items-center gap-1.5 text-[13px] font-semibold text-ink", onTitle && "hover:text-accent")}
      >
        {accent && <span>{accent}</span>}
        {title}
      </button>
      {children}
    </section>
  );
}

function PresenceCard({ other, meta }: { other: any; meta: any }) {
  const online = !!meta;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-hairline bg-canvas px-3.5 py-2.5 shadow-card">
      <Avatar profile={other} size={38} presence={online ? meta.state : "offline"} />
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-ink">{other.name}</div>
        <div className="flex items-center gap-1 text-2xs text-ink-secondary">
          {online ? (
            meta.viewing ? (
              <>
                <Eye size={11} /> <span className="truncate">viendo {meta.viewing}</span>
              </>
            ) : (
              <>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: PRESENCE[meta.state as keyof typeof PRESENCE].color }} />
                {meta.customStatus || PRESENCE[meta.state as keyof typeof PRESENCE].label}
              </>
            )
          ) : (
            "desconectada/o"
          )}
        </div>
      </div>
    </div>
  );
}

function HomeTaskRow({ task }: { task: any }) {
  const openPeek = useUI((s) => s.openPeek);
  const toggle = useToggleTask();
  const { sounds, celebrate } = usePrefs();
  const done = task.status === "done";
  return (
    <div
      onClick={() => openPeek({ kind: "task", id: task.id })}
      className="group flex cursor-pointer items-center gap-3 rounded-md px-1.5 py-1.5 transition-colors hover:bg-surface-hover"
    >
      <StatusCheckbox
        checked={done}
        onToggle={() => {
          toggle.mutate({ task, done: !done });
          if (!done) {
            if (celebrate) fireConfetti();
            if (sounds) playChime();
          }
        }}
        size={17}
      />
      <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{task.title}</span>
      {task.project && <span className="hidden text-sm sm:inline">{task.project.emoji}</span>}
      <ScheduleChip date={task.start_date} start={task.start_time} end={task.end_time} />
      <PriorityDot value={task.priority} />
      <DueChip value={task.due_date} status={task.status} time={task.due_time} />
    </div>
  );
}
