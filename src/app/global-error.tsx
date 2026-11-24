"use client";

import { StatusScreen } from "@/components/marketing/StatusScreen";
import { Button } from "@/components/ui/button";
import "./globals.css";

/** Replaces the root layout when that itself fails. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <title>Something went wrong | GARVHEM</title>
        <StatusScreen
          code="500"
          title="Something went wrong on our side"
          text="Please try again in a moment."
        >
          <Button variant="brand" size="lg" onClick={reset}>
            Try again
          </Button>
        </StatusScreen>
      </body>
    </html>
  );
}
