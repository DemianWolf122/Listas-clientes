"use client";

import * as RMenu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

export const Menu = RMenu.Root;
export const MenuTrigger = RMenu.Trigger;

export function MenuContent({
  children,
  className,
  align = "end",
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof RMenu.Content>) {
  return (
    <RMenu.Portal>
      <RMenu.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-[60] min-w-[190px] animate-scale-in rounded-xl border border-hairline bg-canvas p-1 shadow-popover outline-none",
          className
        )}
        {...props}
      >
        {children}
      </RMenu.Content>
    </RMenu.Portal>
  );
}

export function MenuItem({
  children,
  className,
  danger,
  ...props
}: React.ComponentProps<typeof RMenu.Item> & { danger?: boolean }) {
  return (
    <RMenu.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-ink outline-none transition-colors data-[highlighted]:bg-surface-hover",
        danger && "text-priority-urgent data-[highlighted]:bg-priority-urgent/10",
        className
      )}
      {...props}
    >
      {children}
    </RMenu.Item>
  );
}

export function MenuSeparator() {
  return <RMenu.Separator className="my-1 h-px bg-hairline" />;
}

export function MenuLabel({ children }: { children: React.ReactNode }) {
  return <RMenu.Label className="px-2 py-1 text-2xs font-medium uppercase tracking-wide text-ink-tertiary">{children}</RMenu.Label>;
}
