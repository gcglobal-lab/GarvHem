import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { MessagePage } from "@/components/portal/message-page";
import { Button } from "@/components/ui/button";

export default function Forbidden() {
  return (
    <MessagePage
      icon={ShieldAlert}
      title="You do not have access to this page"
      description="Ask your administrator if you think you should."
      action={
        <Button asChild>
          <Link href="/portal">Back to dashboard</Link>
        </Button>
      }
    />
  );
}
