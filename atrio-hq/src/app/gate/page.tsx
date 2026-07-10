import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { gateHash, GATE_COOKIE } from "@/lib/gate";

async function enter(formData: FormData) {
  "use server";
  const pass = process.env.ATRIO_PASSCODE;
  const input = String(formData.get("passcode") ?? "");
  const next = String(formData.get("next") ?? "/");
  const safeNext = next.startsWith("/") ? next : "/";

  if (pass && input === pass) {
    const store = await cookies();
    store.set(GATE_COOKIE, await gateHash(pass), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    redirect(safeNext);
  }
  redirect(`/gate?e=1&next=${encodeURIComponent(safeNext)}`);
}

export default async function GatePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; e?: string }>;
}) {
  const sp = await searchParams;
  const wrong = sp.e === "1";

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <form
        action={enter}
        className="w-full max-w-sm animate-scale-in rounded-2xl border border-hairline bg-canvas p-8 shadow-subtle"
      >
        <div className="mb-1 text-3xl">🏛️</div>
        <h1 className="text-xl font-semibold tracking-tight">HQ de Atrio</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Ingresá el passcode del estudio para pasar.
        </p>
        <input type="hidden" name="next" value={sp.next ?? "/"} />
        <input
          autoFocus
          name="passcode"
          type="password"
          placeholder="••••••••"
          className="mt-5 w-full rounded-lg border border-hairline bg-canvas px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
        {wrong && (
          <p className="mt-2 text-xs text-priority-urgent">Passcode incorrecto, probá de nuevo.</p>
        )}
        <button
          type="submit"
          className="mt-4 w-full rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg transition hover:opacity-90"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
