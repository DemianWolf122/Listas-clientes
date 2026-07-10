"use client";

import * as RPopover from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";

export const Popover = RPopover.Root;
export const PopoverTrigger = RPopover.Trigger;
export const PopoverAnchor = RPopover.Anchor;

export function PopoverContent({
  children,
  className,
  align = "start",
  side = "bottom",
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof RPopover.Content>) {
  return (
    <RPopover.Portal>
      <RPopover.Content
        align={align}
        side={side}
        sideOffset={sideOffset}
        className={cn(
          "z-[60] min-w-[180px] animate-scale-in rounded-xl border border-hairline bg-canvas p-1 shadow-popover outline-none",
          className
        )}
        {...props}
      >
        {children}
      </RPopover.Content>
    </RPopover.Portal>
  );
}
