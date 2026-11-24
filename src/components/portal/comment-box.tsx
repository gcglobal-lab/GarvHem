"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { commentOnReportAction } from "@/actions/reports";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/form";
import { useAction } from "@/components/ui/use-action";

export function ReportCommentForm({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const { run, pending } = useAction(commentOnReportAction, {
    success: "Feedback sent.",
    onSuccess: () => {
      setBody("");
      router.refresh();
    },
  });
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (body.trim()) void run({ reportId, body });
      }}
    >
      <Field label="Add feedback">
        <Textarea value={body} maxLength={2000} onChange={(e) => setBody(e.target.value)} />
      </Field>
      <Button type="submit" loading={pending} disabled={!body.trim()}>
        Send
      </Button>
    </form>
  );
}
