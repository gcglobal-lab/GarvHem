"use client";

import type { ComponentProps } from "react";
import { Dialog } from "@/components/ui/dialog";
import { LeadForm } from "./LeadForm";

type Props = ComponentProps<typeof LeadForm> & { open: boolean; onOpenChange: (open: boolean) => void };

export function QuoteDialog({ open, onOpenChange, ...form }: Props) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Get a quote"
      description="Tell us what you need. We reply within 24 hours."
      size="lg"
    >
      <LeadForm {...form} />
    </Dialog>
  );
}
