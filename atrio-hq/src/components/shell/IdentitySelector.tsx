"use client";

import { useProfiles } from "@/hooks/profiles";
import { useIdentity } from "@/stores/identity";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";

export function IdentitySelector() {
  const { data: profiles, isLoading, error } = useProfiles();
  const setProfileId = useIdentity((s) => s.setProfileId);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-6 py-10">
      <div className="animate-fade-in-up text-center">
        <div className="text-5xl">🏛️</div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">HQ de Atrio</h1>
        <p className="mt-1 text-sm text-ink-secondary">¿Quién sos?</p>
      </div>

      {error ? (
        <SetupHint message={String((error as Error)?.message ?? error)} />
      ) : (
        <div className="mt-8 grid w-full max-w-md grid-cols-2 gap-4">
          {isLoading &&
            [0, 1].map((i) => (
              <div key={i} className="rounded-2xl border border-hairline bg-canvas p-5">
                <Skeleton className="mx-auto h-[72px] w-[72px] rounded-full" />
                <Skeleton className="mx-auto mt-3 h-4 w-20" />
                <Skeleton className="mx-auto mt-2 h-3 w-16" />
              </div>
            ))}
          {profiles?.map((p) => (
            <button
              key={p.id}
              onClick={() => setProfileId(p.id)}
              className="group flex animate-scale-in flex-col items-center gap-3 rounded-2xl border border-hairline bg-canvas p-6 shadow-subtle transition-all duration-150 hover:-translate-y-0.5 hover:border-hairline-strong hover:shadow-float"
            >
              <Avatar profile={p} size={72} />
              <div className="text-center">
                <div className="font-semibold text-ink">{p.name}</div>
                <div className="text-[13px] text-ink-secondary">{p.role}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      <p className="mt-8 text-2xs text-ink-tertiary">Elegí tu perfil para entrar al cuartel general.</p>
    </div>
  );
}

function SetupHint({ message }: { message: string }) {
  return (
    <div className="mt-8 max-w-md rounded-2xl border border-hairline bg-canvas p-5 text-sm shadow-subtle">
      <p className="font-medium text-ink">Falta un pasito de configuración 🔧</p>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-secondary">
        No pude leer los perfiles. Lo más probable es que el schema{" "}
        <code className="rounded bg-surface px-1 py-0.5 text-ink">atrio_agenda</code> todavía no esté
        expuesto en la API de Supabase. Andá a{" "}
        <span className="font-medium text-ink">Project Settings → API → Exposed schemas</span> y
        agregá <code className="rounded bg-surface px-1 py-0.5 text-ink">atrio_agenda</code>.
      </p>
      <p className="mt-2 rounded-lg bg-surface p-2 text-2xs text-ink-tertiary">{message}</p>
    </div>
  );
}
