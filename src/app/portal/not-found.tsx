import { SearchX } from "lucide-react";
import Link from "next/link";
import { MessagePage } from "@/components/portal/message-page";
import { Button } from "@/components/ui/button";

export default function PortalNotFound() {
  return (
    <MessagePage
      icon={SearchX}
      title="We could not find that"
      description="It may have been removed, or it belongs to someone else."
      action={
        <Button asChild>
          <Link href="/portal">Back to dashboard</Link>
        </Button>
      }
    />
  );
}
