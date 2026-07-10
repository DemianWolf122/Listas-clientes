"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onOpenChange,
  children,
  title,
  description,
  className,
  wide,
  showClose = true,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
  wide?: boolean;
  showClose?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 animate-overlay-in bg-ink/25 backdrop-blur-[1px]" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 max-h-[88vh] w-[92vw] -translate-x-1/2 -translate-y-1/2 animate-scale-in overflow-y-auto rounded-2xl border border-hairline bg-canvas p-5 shadow-float outline-none",
            wide ? "max-w-2xl" : "max-w-md",
            className
          )}
        >
          {title ? (
            <Dialog.Title className="text-base font-semibold tracking-tight">{title}</Dialog.Title>
          ) : (
            <VisuallyHidden>
              <Dialog.Title>Diálogo</Dialog.Title>
            </VisuallyHidden>
          )}
          {description && (
            <Dialog.Description className="mt-0.5 text-[13px] text-ink-secondary">
              {description}
            </Dialog.Description>
          )}
          {showClose && (
            <Dialog.Close className="icon-btn absolute right-3 top-3">
              <X size={16} />
            </Dialog.Close>
          )}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
