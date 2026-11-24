"use client";

import Link from "next/link";
import { Accordion as AccordionPrimitive, Tabs as TabsPrimitive } from "radix-ui";
import { ChevronDown } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

const bar = "no-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-xl bg-surface-2 p-1";
const tab =
  "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium whitespace-nowrap text-muted transition-colors hover:text-foreground [&_svg]:size-4";
const tabOn = "bg-surface text-foreground shadow-sm";

export const Tabs = TabsPrimitive.Root;
export const TabsList = ({ className, ...p }: ComponentProps<typeof TabsPrimitive.List>) => (
  <TabsPrimitive.List className={cn(bar, "w-fit", className)} {...p} />
);
export const TabsTrigger = ({ className, ...p }: ComponentProps<typeof TabsPrimitive.Trigger>) => (
  <TabsPrimitive.Trigger
    className={cn(
      tab,
      "data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:shadow-sm",
      className,
    )}
    {...p}
  />
);
export const TabsContent = ({ className, ...p }: ComponentProps<typeof TabsPrimitive.Content>) => (
  <TabsPrimitive.Content className={cn("mt-4 outline-none", className)} {...p} />
);

/** Tabs that are links, so every view has its own URL. */
export function LinkTabs({
  items,
  label,
  className,
}: {
  items: { href: string; label: ReactNode; active: boolean }[];
  label: string;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={cn(bar, "w-fit", className)}>
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={i.active ? "page" : undefined}
          className={cn(tab, i.active && tabOn)}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

export function Accordion({
  items,
  className,
}: {
  items: { question: string; answer: ReactNode }[];
  className?: string;
}) {
  return (
    <AccordionPrimitive.Root type="single" collapsible className={cn("divide-y divide-border", className)}>
      {items.map((i, index) => (
        <AccordionPrimitive.Item key={i.question} value={`item-${index}`}>
          <AccordionPrimitive.Header>
            <AccordionPrimitive.Trigger className="group flex w-full items-center justify-between gap-6 py-5 text-left font-display text-base font-semibold tracking-tight sm:text-lg">
              {i.question}
              <ChevronDown
                className="size-5 shrink-0 text-muted transition-transform duration-200 group-data-[state=open]:rotate-180"
                aria-hidden
              />
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <div className="max-w-3xl pb-6 text-muted">{i.answer}</div>
          </AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      ))}
    </AccordionPrimitive.Root>
  );
}
