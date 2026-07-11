import { NextResponse } from "next/server";
import { buildIcs, icsResponse, UUID_RE } from "@/lib/ics";

/**
 * Feed iCal con forma de archivo — lo que mejor validan Apple Calendar y otros
 * clientes (sin query strings):
 *
 *   /api/ics/atrio.ics    → toda la agenda
 *   /api/ics/<uuid>.ics   → tareas de esa persona + eventos
 */

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { feed: string } }) {
  const feed = decodeURIComponent(params.feed ?? "");
  if (!feed.endsWith(".ics")) return new NextResponse("No encontrado", { status: 404 });

  const name = feed.slice(0, -4);
  let assignee: string | null = null;
  if (name !== "atrio") {
    if (!UUID_RE.test(name)) return new NextResponse("No encontrado", { status: 404 });
    assignee = name;
  }

  const body = await buildIcs(assignee);
  if (!body) return new NextResponse("No se pudo generar la agenda", { status: 502 });
  return icsResponse(body);
}
