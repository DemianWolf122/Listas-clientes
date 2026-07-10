"use client";

import { cn, readableText } from "@/lib/utils";

export function Badge({
  children,
  color,
  className,
  dot,
}: {
  children: React.ReactNode;
  color?: string | null;
  className?: string;
  dot?: string;
}) {
  const style = color ? { background: color, color: readableText(color) } : undefined;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-2xs font-medium",
        !color && "bg-surface text-ink-secondary",
        className
      )}
      style={style}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />}
      {children}
    </span>
  );
}
