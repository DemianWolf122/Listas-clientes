import { ImageResponse } from "next/og";
import { AtrioBadge } from "@/lib/brand";

// Badge monocromo para la barra de estado de Android: el sistema lo tinta, así
// que va blanco sobre transparente (solo importa el canal alfa). Se sirve como
// route handler en /badge (un archivo suelto en app/ no sería una ruta).
export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(AtrioBadge(96), { width: 96, height: 96 });
}
