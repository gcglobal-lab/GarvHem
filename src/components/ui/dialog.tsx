"use client";

import { X } from "lucide-react";
import { AlertDialog, Dialog as DialogPrimitive } from "radix-ui";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

const overlay = "fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-[2px] data-[state=open]:animate-fade-in";

export function Dialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  size = "md",
  className,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger> : null}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={overlay} />
        <div className="pointer-events-none fixed inset-0 z-50 grid place-items-end sm:place-items-center sm:p-6">
          <DialogPrimitive.Content
            {...(description ? {} : { "aria-describedby": undefined })}
            className={cn(
              "pointer-events-auto flex max-h-[92dvh] w-full flex-col rounded-t-2xl border border-border bg-surface text-foreground shadow-lift data-[state=open]:animate-pop-in sm:rounded-2xl",
              { sm: "sm:max-w-sm", md: "sm:max-w-lg", lg: "sm:max-w-2xl", xl: "sm:max-w-4xl" }[size],
              className,
            )}
          >
            <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
              <div className="min-w-0">
                <DialogPrimitive.Title className="font-display text-base font-semibold tracking-tight">
                  {title}
                </DialogPrimitive.Title>
                {description ? (
                  <DialogPrimitive.Description className="mt-0.5 text-[13px] text-muted">
                    {description}
                  </DialogPrimitive.Description>
                ) : null}
              </div>
              <DialogPrimitive.Close asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Close" className="-mt-1 -mr-1">
                  <X aria-hidden />
                </Button>
              </DialogPrimitive.Close>
            </header>
            <div className="min-h-0 flex-1 scrollbar-thin overflow-y-auto px-5 py-5">{children}</div>
          </DialogPrimitive.Content>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export const DialogClose = DialogPrimitive.Close;

export function DialogFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}>
      {children}
    </div>
  );
}

/** Confirmation for destructive actions. `onConfirm` may be async; the dialog stays open while it runs. */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Confirm",
  tone = "danger",
  onConfirm,
}: {
  trigger: ReactNode;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  tone?: "danger" | "primary";
  onConfirm: () => unknown;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <AlertDialog.Root open={open} onOpenChange={(o) => !busy && setOpen(o)}>
      <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className={overlay} />
        <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center p-4">
          <AlertDialog.Content className="pointer-events-auto w-full max-w-md rounded-2xl border border-border bg-surface p-6 text-foreground shadow-lift data-[state=open]:animate-pop-in">
            <AlertDialog.Title className="font-display text-lg font-semibold tracking-tight">
              {title}
            </AlertDialog.Title>
            <AlertDialog.Description asChild>
              <div className="mt-2 text-sm text-muted">{description}</div>
            </AlertDialog.Description>
            <DialogFooter>
              <AlertDialog.Cancel asChild>
                <Button variant="outline" disabled={busy}>
                  Cancel
                </Button>
              </AlertDialog.Cancel>
              <Button
                variant={tone}
                loading={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await onConfirm();
                    setOpen(false);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {confirmLabel}
              </Button>
            </DialogFooter>
          </AlertDialog.Content>
        </div>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

/** Left drawer, used for mobile navigation. */
export function Drawer({
  open,
  onOpenChange,
  title,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={overlay} />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-[min(20rem,86vw)] flex-col bg-surface text-foreground shadow-lift data-[state=open]:animate-slide-in",
            className,
          )}
        >
          <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
