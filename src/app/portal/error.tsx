"use client";

import { TriangleAlert } from "lucide-react";
import { MessagePage } from "@/components/portal/message-page";
import { Button } from "@/components/ui/button";

export default function PortalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <MessagePage
      icon={TriangleAlert}
      title="This page could not load"
      description="Your data is safe. Try again, and tell your administrator if it keeps happening."
      action={<Button onClick={reset}>Try again</Button>}
    />
  );
}
