"use client";

import { RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { StatusScreen } from "@/components/marketing/StatusScreen";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[page error]", error.digest ?? error.name);
  }, [error]);
  return (
    <StatusScreen
      code="500"
      title="Something went wrong on our side"
      text={`Please try again. If it keeps happening, tell us what you were doing${error.digest ? ` and mention reference ${error.digest}` : ""}.`}
    >
      <Button variant="brand" size="lg" onClick={reset}>
        <RotateCcw aria-hidden />
        Try again
      </Button>
      {/* A full load, so a broken client state cannot survive. */}
      <Button variant="glass" size="lg" onClick={() => window.location.assign("/")}>
        Go to the home page
      </Button>
    </StatusScreen>
  );
}
