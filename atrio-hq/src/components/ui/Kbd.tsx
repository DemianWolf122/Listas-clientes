import { cn } from "@/lib/utils";

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-hairline bg-surface px-1 text-[11px] font-medium text-ink-tertiary",
        className
      )}
    >
      {children}
    </kbd>
  );
}
