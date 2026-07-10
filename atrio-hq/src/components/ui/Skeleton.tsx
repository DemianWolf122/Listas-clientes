import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-surface-active/70", className)} />;
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className={cn("h-4", i % 2 ? "w-2/5" : "w-3/5")} />
          <Skeleton className={cn("h-4", i % 2 ? "w-1/4" : "w-1/6")} />
        </div>
      ))}
    </div>
  );
}
