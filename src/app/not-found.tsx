import type { Metadata } from "next";
import Link from "next/link";
import { StatusScreen } from "@/components/marketing/StatusScreen";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <StatusScreen
      code="404"
      title="This page does not exist"
      text="The address may have changed, or the link was mistyped."
    >
      <Button asChild variant="brand" size="lg">
        <Link href="/">Go to the home page</Link>
      </Button>
      <Button asChild variant="glass" size="lg">
        <Link href="/contact">Contact us</Link>
      </Button>
    </StatusScreen>
  );
}
