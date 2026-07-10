import { NextResponse, type NextRequest } from "next/server";
import { gateHash, GATE_COOKIE } from "@/lib/gate";

/**
 * Gate opcional por passcode compartido. Si ATRIO_PASSCODE está vacío, la app
 * queda abierta (dev). Si está seteado, exige la cookie firmada. Es "cerrar la
 * puerta" de una app interna de 2 personas; la seguridad de datos la da RLS.
 */
export async function middleware(req: NextRequest) {
  const pass = process.env.ATRIO_PASSCODE;
  if (!pass) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/gate")) return NextResponse.next();

  const cookie = req.cookies.get(GATE_COOKIE)?.value;
  const expected = await gateHash(pass);
  if (cookie === expected) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/gate";
  url.searchParams.set("next", pathname === "/gate" ? "/" : pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
