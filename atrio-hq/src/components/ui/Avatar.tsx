"use client";

import { cn, initials, readableText } from "@/lib/utils";
import { PRESENCE, type PresenceState } from "@/lib/constants";
import type { Profile } from "@/lib/types/database";

export function Avatar({
  profile,
  size = 28,
  presence,
  className,
  ring = false,
}: {
  profile?: Pick<Profile, "name" | "emoji" | "accent_color"> | null;
  size?: number;
  presence?: PresenceState | null;
  className?: string;
  ring?: boolean;
}) {
  const bg = profile?.accent_color ?? "#E9E9E7";
  const fg = readableText(bg);
  const content = profile?.emoji ? profile.emoji : initials(profile?.name);
  const dot = Math.max(8, Math.round(size * 0.3));

  return (
    <span className={cn("relative inline-flex shrink-0", className)} style={{ width: size, height: size }}>
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full font-medium leading-none",
          ring && "ring-2 ring-canvas"
        )}
        style={{
          width: size,
          height: size,
          background: bg,
          color: fg,
          fontSize: profile?.emoji ? size * 0.52 : size * 0.4,
        }}
      >
        {content}
      </span>
      {presence && (
        <span
          className="absolute bottom-0 right-0 rounded-full ring-2 ring-canvas"
          style={{ width: dot, height: dot, background: PRESENCE[presence].color }}
          title={PRESENCE[presence].label}
        />
      )}
    </span>
  );
}
