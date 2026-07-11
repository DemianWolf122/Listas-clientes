"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, Volume2, PartyPopper, LogOut, Smartphone, Check, Palette } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { PWAInstallButton } from "@/components/settings/PWAInstallButton";
import { useCurrentProfile } from "@/hooks/profiles";
import { useIdentity } from "@/stores/identity";
import { usePrefs } from "@/stores/ui";
import { useAnnounceViewing } from "@/components/providers/PresenceProvider";
import { CUSTOM_THEMES, type ThemeDef } from "@/lib/themes";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const me = useCurrentProfile();
  const clear = useIdentity((s) => s.clear);
  const { sounds, toggleSounds, celebrate, toggleCelebrate } = usePrefs();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useAnnounceViewing("la configuración");

  return (
    <div className="h-full overflow-y-auto">
      <header className="flex items-center gap-3 border-b border-hairline px-4 py-3 sm:px-6">
        <h1 className="text-lg font-semibold tracking-tight">Configuración</h1>
      </header>

      <div className="mx-auto max-w-2xl space-y-5 px-4 py-6 sm:px-6">
        {/* Instalar */}
        <Section
          icon={<Smartphone size={16} />}
          title="Instalar la app"
          hint="Tenela en la pantalla de inicio y abrila como una app, a pantalla completa."
        >
          <PWAInstallButton />
        </Section>

        {/* Apariencia */}
        <Section icon={<Sun size={16} />} title="Apariencia">
          <div className="flex gap-2">
            <ThemeBtn active={mounted && theme === "light"} onClick={() => setTheme("light")} icon={<Sun size={15} />} label="Claro" />
            <ThemeBtn active={mounted && theme === "dark"} onClick={() => setTheme("dark")} icon={<Moon size={15} />} label="Oscuro" />
            <ThemeBtn active={mounted && theme === "system"} onClick={() => setTheme("system")} icon={<Monitor size={15} />} label="Sistema" />
          </div>
          <div className="mt-4 mb-2 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-tertiary">
            <Palette size={13} /> Temas
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {CUSTOM_THEMES.map((t) => (
              <ThemeCard key={t.id} t={t} active={mounted && theme === t.id} onClick={() => setTheme(t.id)} />
            ))}
          </div>
        </Section>

        {/* Feedback */}
        <Section icon={<PartyPopper size={16} />} title="Sonidos y celebraciones">
          <ToggleRow
            icon={<Volume2 size={15} />}
            label="Sonidos sutiles"
            hint="Un pop al llegar un mensaje, un chime al completar una tarea."
            on={sounds}
            onToggle={toggleSounds}
          />
          <ToggleRow
            icon={<PartyPopper size={15} />}
            label="Celebraciones"
            hint="Confetti al completar una tarea."
            on={celebrate}
            onToggle={toggleCelebrate}
          />
        </Section>

        {/* Cuenta */}
        <Section icon={<LogOut size={16} />} title="Sesión">
          <div className="flex items-center gap-3">
            <Avatar profile={me} size={40} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-ink">{me?.name}</div>
              <div className="text-2xs text-ink-secondary">{me?.role}</div>
            </div>
            <Button variant="outline" size="sm" onClick={clear}>
              <LogOut size={14} /> Cambiar de persona
            </Button>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  hint,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-hairline bg-canvas p-4 shadow-card">
      <div className="mb-1 flex items-center gap-2 text-[13px] font-semibold text-ink">
        <span className="text-ink-secondary">{icon}</span>
        {title}
      </div>
      {hint && <p className="mb-3 text-[13px] text-ink-secondary">{hint}</p>}
      <div className={hint ? "" : "mt-3"}>{children}</div>
    </section>
  );
}

function ThemeBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-[13px] font-medium transition-colors",
        active ? "border-accent bg-accent-soft/50 text-accent" : "border-hairline text-ink-secondary hover:bg-surface-hover"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function ThemeCard({ t, active, onClick }: { t: ThemeDef; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-xl border p-1.5 text-left transition-all",
        active ? "border-accent ring-2 ring-accent/25" : "border-hairline hover:border-hairline-strong hover:bg-surface-hover"
      )}
    >
      {/* mini-preview: barra lateral + líneas + botón de acento */}
      <div
        className="h-12 w-full rounded-lg border border-black/10 p-1.5"
        style={{ background: t.swatch[0] }}
      >
        <div className="flex h-full gap-1">
          <div className="w-1/3 rounded-[5px]" style={{ background: t.swatch[2] }} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="h-1.5 w-3/4 rounded-full" style={{ background: t.swatch[2] }} />
            <div className="h-1.5 w-1/2 rounded-full opacity-70" style={{ background: t.swatch[2] }} />
            <div className="mt-auto h-2 w-8 rounded-full" style={{ background: t.swatch[1] }} />
          </div>
        </div>
      </div>
      <div className="mt-1.5 flex items-center gap-1 px-0.5">
        <span className="text-[13px] leading-none">{t.emoji}</span>
        <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-ink">{t.label}</span>
        {active && <Check size={13} className="shrink-0 text-accent" />}
      </div>
    </button>
  );
}

function ToggleRow({
  icon,
  label,
  hint,
  on,
  onToggle,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-ink-secondary">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] text-ink">{label}</div>
        {hint && <div className="text-2xs text-ink-tertiary">{hint}</div>}
      </div>
      <button
        onClick={onToggle}
        role="switch"
        aria-checked={on}
        className={cn(
          "relative h-6 w-10 shrink-0 rounded-full transition-colors",
          on ? "bg-accent" : "bg-surface-active"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
            on ? "translate-x-[18px]" : "translate-x-0.5"
          )}
        />
      </button>
    </div>
  );
}
