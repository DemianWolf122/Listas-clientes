import { NextResponse } from "next/server";
import { buildIcs, icsResponse, UUID_RE } from "@/lib/ics";

/**
 * Feed iCal por query (?assignee=<uuid>). Se mantiene por compatibilidad con
 * suscripciones viejas; los links nuevos usan /api/ics/<feed>.ics.
 */

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("assignee");
  const assignee = raw && UUID_RE.test(raw) ? raw : null;
  const body = await buildIcs(assignee);
  if (!body) return new NextResponse("No se pudo generar la agenda", { status: 502 });
  return icsResponse(body);
}
