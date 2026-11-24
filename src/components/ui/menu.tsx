"use client";

import { DropdownMenu, Popover as PopoverPrimitive, Tooltip as TooltipPrimitive } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

const panel =
  "z-50 rounded-xl border border-border bg-surface p-1.5 text-foreground shadow-lift data-[state=open]:animate-pop-in";

export const Menu = DropdownMenu.Root;
export const MenuTrigger = DropdownMenu.Trigger;

export function MenuContent({ className, ...props }: ComponentProps<typeof DropdownMenu.Content>) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        sideOffset={8}
        align="end"
        className={cn(panel, "min-w-48", className)}
        {...props}
      />
    </DropdownMenu.Portal>
  );
}

export function MenuItem({
  className,
  tone = "default",
  ...props
}: ComponentProps<typeof DropdownMenu.Item> & { tone?: "default" | "danger" }) {
  return (
    <DropdownMenu.Item
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-surface-2 [&_svg]:size-4 [&_svg]:text-muted",
        tone === "danger" && "text-danger [&_svg]:text-danger",
        className,
      )}
      {...props}
    />
  );
}

export const MenuSeparator = () => <DropdownMenu.Separator className="my-1.5 h-px bg-border" />;

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;
export const PopoverClose = PopoverPrimitive.Close;

export function PopoverContent({ className, ...props }: ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        sideOffset={8}
        align="end"
        collisionPadding={12}
        className={cn(panel, className)}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

export const TooltipProvider = TooltipPrimitive.Provider;

export function Tooltip({
  label,
  children,
  side = "top",
}: {
  label: ReactNode;
  children: ReactNode;
  side?: ComponentProps<typeof TooltipPrimitive.Content>["side"];
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className="z-50 max-w-64 rounded-lg bg-ink px-2.5 py-1.5 text-xs text-white shadow-lift data-[state=delayed-open]:animate-fade-in dark:bg-white dark:text-ink"
        >
          {label}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
