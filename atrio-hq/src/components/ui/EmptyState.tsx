import { cn } from "@/lib/utils";

/** Empty states con personalidad, en voseo. */
export function EmptyState({
  emoji = "🌱",
  title,
  hint,
  action,
  className,
}: {
  emoji?: string;
  title: string;
  hint?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl px-6 py-12 text-center",
        className
      )}
    >
      <div className="text-4xl grayscale-[0.15]">{emoji}</div>
      <p className="text-sm font-medium text-ink">{title}</p>
      {hint && <p className="max-w-xs text-[13px] text-ink-secondary">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
