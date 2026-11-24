"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";

/** Shown at punch-out when today's report is missing. */
export function ReportPrompt({
  mode,
  pending,
  onClose,
  onSkip,
}: {
  mode: "required" | "reminder" | null;
  pending: boolean;
  onClose: () => void;
  onSkip: () => void;
}) {
  return (
    <Dialog
      open={mode !== null}
      onOpenChange={(o) => !o && onClose()}
      size="sm"
      title="Submit your daily report first"
      description="Today's report is still missing."
    >
      <p className="text-sm text-muted">
        {mode === "required"
          ? "Your company requires a daily report before you punch out. It takes about two minutes."
          : "It takes about two minutes and keeps your team up to date. You can also punch out now and write it before the cutoff."}
      </p>
      <DialogFooter>
        {mode === "reminder" ? (
          <Button variant="outline" onClick={onSkip} loading={pending}>
            Punch out anyway
          </Button>
        ) : null}
        <Button asChild variant="brand">
          <Link href="/portal/daily-report?punchout=1" onClick={onClose}>
            Write the report
          </Link>
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
