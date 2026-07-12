"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, Volume2, PartyPopper, LogOut, Smartphone, Check, Palette, CalendarPlus, Copy, ExternalLink, Bell, BellOff, Bot } from "lucide-react";
import { MCP_SECRET_FALLBACK } from "@/lib/mcp-config";
import {
  getPushState,
  enablePush,
  disablePush,
  showLocalTest,
  sendServerTest,
  getDiagnostics,
  onPushEcho,
  type PushState,
  type Diagnostics,
} from "@/lib/push";
import { playNotify } from "@/lib/sound";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { PWAInstallButton } from "@/components/settings/PWAInstallButton";
import { useCurrentProfile } from "@/hooks/profiles";
import { useIdentity } from "@/stores/identity";
import { usePrefs } from "@/stores/ui";
import { useAnnounceViewing } from "@/components/providers/PresenceProvider";
import { CUSTOM_THEMES, type ThemeDef } from "@/lib/themes";
import { ThemeArt } from "@/components/shell/ThemeArt";
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

        {/* Notificaciones push */}
        <Section
          icon={<Bell size={16} />}
          title="Notificaciones en el dispositivo"
          hint="Recibí avisos como los de una app: cuando te asignan una tarea, te mencionan en el chat, o algo está por arrancar/vencer. Instalá la app antes para que anden en el iPhone/iPad."
        >
          <NotifButton meId={me?.id} />
        </Section>

        {/* Sincronizar calendario */}
        <Section
          icon={<CalendarPlus size={16} />}
          title="Sincronizar con tu calendario"
          hint="Suscribí tu agenda de Atrio en Google Calendar, Apple Calendar o el calendario de tu teléfono. Es de solo lectura y se actualiza sola cada ~1 h."
        >
          <CalendarSync meId={me?.id} />
        </Section>

        {/* Conector de Claude */}
        <Section
          icon={<Bot size={16} />}
          title="Asistente Claude (conector)"
          hint="Conectá Atrio a tu Claude: desde claude.ai (web, celu o desktop) le pedís cosas y las hace acá adentro — crear tareas y eventos, escribir docs, mandar mensajes, leer la agenda."
        >
          <ClaudeConnector />
        </Section>

        {/* Apariencia */}
        <Section icon={<Sun size={16} />} title="Apariencia">
          <div className="flex gap-2">
            <ThemeBtn active={mounted && theme === "light"} onClick={() => setTheme("light")} icon={<Sun size={15} />} label="Claro" />
            <ThemeBtn active={mounted && theme === "dark"} onClick={() => setTheme("dark")} icon={<Moon size={15} />} label="Oscuro" />
            <ThemeBtn active={mounted && theme === "system"} onClick={() => setTheme("system")} icon={<Monitor size={15} />} label="Sistema" />
          </div>
          <div className="mt-4 mb-2 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-tertiary">
            <Palette size={13} /> Temas ilustrados
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {CUSTOM_THEMES.filter((t) => !t.simple).map((t) => (
              <ThemeCard key={t.id} t={t} active={mounted && theme === t.id} onClick={() => setTheme(t.id)} />
            ))}
          </div>
          <div className="mt-4 mb-2 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-tertiary">
            <Palette size={13} /> Temas lisos · mismos colores, sin dibujos
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {CUSTOM_THEMES.filter((t) => t.simple).map((t) => (
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
      {/* mini-preview con los tokens, el fondo y la escena reales del tema */}
      <div
        className={cn("relative h-14 w-full overflow-hidden rounded-lg border border-black/10", `theme-${t.id}`)}
        style={{ background: "rgb(var(--canvas))" }}
      >
        <div className="theme-backdrop" />
        <div
          className="pointer-events-none absolute left-0 top-0"
          style={{ width: "400%", height: "400%", transform: "scale(0.25)", transformOrigin: "top left" }}
        >
          <div className="relative h-full w-full">
            <ThemeArt themeId={t.id} />
          </div>
        </div>
        <div className="relative z-[1] flex h-full gap-1 p-1.5">
          <div className="w-1/4 rounded-[5px] opacity-80" style={{ background: "rgb(var(--surface-active))" }} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="h-1.5 w-3/4 rounded-full opacity-80" style={{ background: "rgb(var(--surface-active))" }} />
            <div className="mt-auto h-2 w-8 rounded-full" style={{ background: "rgb(var(--accent))" }} />
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

function hostLabel(host: string | null) {
  if (!host) return null;
  if (host.includes("windows")) return "Windows (Edge)";
  if (host.includes("apple")) return "Apple (Safari)";
  if (host.includes("google") || host.includes("fcm")) return "Chrome";
  if (host.includes("mozilla")) return "Firefox";
  return host;
}

function NotifButton({ meId }: { meId?: string }) {
  const [state, setState] = useState<PushState | "loading" | "working">("loading");
  const [diag, setDiag] = useState<Diagnostics | null>(null);
  const [lastPush, setLastPush] = useState<number | null>(null);
  useEffect(() => {
    getPushState().then(setState);
    getDiagnostics().then(setDiag);
  }, []);
  // "Echo" del service worker: prueba que el push llegó de verdad al dispositivo.
  useEffect(() => {
    return onPushEcho(() => setLastPush(Date.now()));
  }, []);

  if (state === "loading") return <div className="h-9" />;
  if (state === "unsupported") {
    return (
      <p className="text-[13px] text-ink-secondary">
        Este navegador no soporta notificaciones. En iPhone/iPad, primero <b>instalá la app</b> (arriba) y abrila desde
        la pantalla de inicio.
      </p>
    );
  }
  if (state === "denied") {
    return (
      <p className="text-[13px] text-ink-secondary">
        Bloqueaste las notificaciones para este sitio. Habilitalas desde los ajustes del navegador/sistema y volvé a
        intentar.
      </p>
    );
  }
  if (state === "on") {
    const device = hostLabel(diag?.endpointHost ?? null);
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-lg bg-[#4FA373]/12 px-3 py-2 text-[13px] font-medium text-[#3d8560]">
            <Check size={16} /> Notificaciones activadas
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              playNotify();
              toast("🔊 ¿Escuchaste el ding?", {
                description: "Este sonido es de la app, no depende de Windows.",
              });
            }}
          >
            <Volume2 size={14} /> Probar sonido
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const local = await showLocalTest();
              if (meId) await sendServerTest(meId);
              toast(local ? "Te mandé una notificación de prueba 🔔" : "Reabrí la app y probá de nuevo");
            }}
          >
            <Bell size={14} /> Probar aviso
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              setState("working");
              await disablePush();
              setState("off");
            }}
          >
            <BellOff size={14} /> Desactivar
          </Button>
        </div>

        {/* Diagnóstico: deja ver en qué punto falla, sin adivinar */}
        <div className="space-y-1 rounded-xl bg-surface/60 p-3 text-2xs text-ink-secondary">
          <DiagRow ok label="Este dispositivo" value={device ?? "suscripto"} />
          <DiagRow ok={!!diag?.swVersion} label="Service worker" value={diag?.swVersion ?? "actualizando…"} />
          <DiagRow
            ok={!!lastPush}
            label="Último push recibido"
            value={lastPush ? "recién ✓" : "todavía ninguno"}
          />
        </div>

        <p className="text-2xs leading-relaxed text-ink-tertiary">
          Con la app <b>abierta</b> vas a escuchar el ding y ver un cartel sí o sí (no depende del sistema). Si con la app{" "}
          <b>cerrada</b> en la PC no te salta el aviso de Windows, revisá: <b>Configuración de Windows → Sistema →
          Notificaciones</b> (activá tu navegador y desactivá el <b>Asistente de concentración</b>). En el navegador,
          que el sitio esté en <b>Permitir</b>.
        </p>
      </div>
    );
  }
  // off
  return (
    <Button
      variant="primary"
      disabled={state === "working" || !meId}
      onClick={async () => {
        if (!meId) return;
        setState("working");
        setState(await enablePush(meId));
      }}
    >
      <Bell size={16} /> Activar notificaciones
    </Button>
  );
}

function ClaudeConnector() {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => setOrigin(window.location.origin), []);
  if (!origin) return null;
  const url = `${origin}/api/mcp/${MCP_SECRET_FALLBACK}`;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-1.5">
        <code className="min-w-0 flex-1 truncate rounded-md bg-surface px-2 py-1.5 text-2xs text-ink-secondary">{url}</code>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-hairline px-2 py-1.5 text-2xs font-medium text-ink transition hover:bg-surface-hover"
        >
          {copied ? <Check size={12} className="text-accent" /> : <Copy size={12} />}
          {copied ? "¡Copiado!" : "Copiar"}
        </button>
      </div>
      <div className="rounded-xl bg-surface/60 p-3 text-2xs leading-relaxed text-ink-secondary">
        <p className="mb-1 font-semibold text-ink">Cómo conectarlo (una vez, cada uno con su cuenta)</p>
        <p>
          1. Tocá <b>Copiar</b>. &nbsp;2. Andá a{" "}
          <a href="https://claude.ai/settings/connectors" target="_blank" rel="noreferrer" className="font-medium text-accent underline">
            claude.ai → Ajustes → Conectores
          </a>{" "}
          → <b>Agregar conector personalizado</b> → pegá la URL. &nbsp;3. Listo: en cualquier chat de Claude activá el
          conector <b>Atrio HQ</b> y pedile, por ejemplo: <i>“creame una tarea para mañana a las 10 con etiqueta Cliente”</i>{" "}
          o <i>“armá el doc del brief y guardalo en Atrio”</i>.
        </p>
        <p className="mt-1 text-ink-tertiary">
          Funciona también en la app de Claude del celu y de la compu (los conectores se sincronizan con tu cuenta). No
          compartas la URL: lleva la llave de acceso.
        </p>
      </div>
    </div>
  );
}

function DiagRow({ ok, label, value }: { ok: boolean; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn("inline-block h-1.5 w-1.5 shrink-0 rounded-full", ok ? "bg-[#4FA373]" : "bg-ink-tertiary/50")}
      />
      <span className="text-ink-tertiary">{label}:</span>
      <span className="font-medium text-ink-secondary">{value}</span>
    </div>
  );
}

function CalendarSync({ meId }: { meId?: string }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => setOrigin(window.location.origin), []);
  if (!origin) return null;

  const feeds = [
    meId ? { key: "mine", label: "Mi agenda (mis tareas + eventos)", url: `${origin}/api/ics/${meId}.ics` } : null,
    { key: "all", label: "Toda la agenda (Lucila + Demian)", url: `${origin}/api/ics/atrio.ics` },
  ].filter(Boolean) as { key: string; label: string; url: string }[];

  function copy(url: string, key: string) {
    navigator.clipboard?.writeText(url);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="space-y-2.5">
      {feeds.map((f) => {
        // webcals:// = suscripción segura por HTTPS directo. Con webcal:// a secas,
        // iOS baja a http:// y el redirect de Vercel rompe la validación de Apple.
        const webcal = f.url.replace(/^https?:\/\//, "webcals://");
        const google = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(f.url)}`;
        return (
          <div key={f.key} className="rounded-xl border border-hairline p-2.5">
            <div className="mb-1.5 text-[13px] font-medium text-ink">{f.label}</div>
            <div className="mb-2 flex items-center gap-1.5">
              <code className="min-w-0 flex-1 truncate rounded-md bg-surface px-2 py-1.5 text-2xs text-ink-secondary">{f.url}</code>
              <button
                onClick={() => copy(f.url, f.key)}
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-hairline px-2 py-1.5 text-2xs font-medium text-ink transition hover:bg-surface-hover"
              >
                {copied === f.key ? <Check size={12} className="text-accent" /> : <Copy size={12} />}
                {copied === f.key ? "¡Copiado!" : "Copiar"}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <a
                href={google}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md bg-accent px-2.5 py-1 text-2xs font-medium text-accent-fg transition hover:opacity-90"
              >
                <ExternalLink size={12} /> Google Calendar
              </a>
              <a
                href={webcal}
                className="inline-flex items-center gap-1 rounded-md border border-hairline px-2.5 py-1 text-2xs font-medium text-ink transition hover:bg-surface-hover"
              >
                <ExternalLink size={12} /> Apple (iPhone/iPad)
              </a>
            </div>
          </div>
        );
      })}
      <div className="rounded-xl bg-surface/60 p-3 text-2xs leading-relaxed text-ink-secondary">
        <p className="mb-1 font-semibold text-ink">Cómo suscribirte</p>
        <p>
          <span className="font-medium text-ink">Android / Google Calendar:</span> tocá “Google Calendar” y confirmá. Si
          no abre, tocá “Copiar” y en la compu andá a Google Calendar → “Otros calendarios” → “+” → “Desde una URL” →
          pegá el link. Después aparece en el teléfono.
        </p>
        <p className="mt-1">
          <span className="font-medium text-ink">iPhone / iPad:</span> tocá “Apple” y confirmá. Si no funciona, tocá
          “Copiar” y andá a Ajustes → Apps → Calendario → Cuentas → Agregar cuenta → Otra → Agregar calendario suscrito
          → pegá el link.
        </p>
      </div>
    </div>
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
