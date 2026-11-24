import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";

export function MessagePage({
  icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <Card className="mx-auto mt-8 max-w-xl">
      <EmptyState icon={icon} title={title} description={description} action={action} className="py-14" />
    </Card>
  );
}
