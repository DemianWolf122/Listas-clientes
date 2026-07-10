"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { cn } from "@/lib/utils";

/** Panel lateral estilo Notion (side-peek). No pierde contexto de la vista. */
export function SidePeek({
  open,
  onOpenChange,
  children,
  className,
  dim = true,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  children: React.ReactNode;
  className?: string;
  dim?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn("fixed inset-0 z-40 animate-overlay-in", dim && "bg-ink/10")}
        />
        <Dialog.Content
          className={cn(
            "fixed right-0 top-0 z-50 flex h-full w-full animate-slide-in-right flex-col border-l border-hairline bg-canvas shadow-peek outline-none sm:w-[480px]",
            className
          )}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <VisuallyHidden>
            <Dialog.Title>Detalle</Dialog.Title>
          </VisuallyHidden>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
