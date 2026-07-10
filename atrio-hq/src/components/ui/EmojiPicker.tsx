"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./Popover";
import { ICON_EMOJIS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function EmojiPicker({
  children,
  onSelect,
  emojis = ICON_EMOJIS,
  align = "start",
  columns = 8,
}: {
  children: React.ReactNode;
  onSelect: (emoji: string) => void;
  emojis?: readonly string[];
  align?: "start" | "center" | "end";
  columns?: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align={align} className="w-[264px] p-2">
        <div
          className="grid max-h-[220px] gap-0.5 overflow-y-auto"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))` }}
        >
          {emojis.map((e) => (
            <button
              key={e}
              onClick={() => {
                onSelect(e);
                setOpen(false);
              }}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md text-lg transition-colors hover:bg-surface-hover"
              )}
            >
              {e}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
