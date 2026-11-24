"use client";

import { Toaster as Sonner, toast } from "sonner";

export { toast };

export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      gap={10}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-xl !border !border-border !bg-surface !text-foreground !shadow-lift !font-sans !text-sm",
          description: "!text-muted",
          success: "[&_[data-icon]]:!text-success",
          error: "[&_[data-icon]]:!text-danger",
        },
      }}
    />
  );
}
