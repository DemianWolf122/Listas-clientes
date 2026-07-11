import { ImageResponse } from "next/og";
import { AtrioTile } from "@/lib/brand";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(AtrioTile(512), { ...size });
}
