import { ImageResponse } from "next/og";
import { AtrioTile } from "@/lib/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Apple recorta las esquinas: el tile va a sangre completa (sin transparencia).
export default function AppleIcon() {
  return new ImageResponse(AtrioTile(180), { ...size });
}
