import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { addDaysISO, formatISODate, monthEnd, monthStart } from "@/lib/time";

/** Previous / next month as plain links. `href` receives "YYYY-MM". */
export function MonthNav({ month, href }: { month: string; href: (month: string) => string }) {
  const first = `${month}-01`;
  const prev = addDaysISO(monthStart(first), -1).slice(0, 7);
  const next = addDaysISO(monthEnd(first), 1).slice(0, 7);
  return (
    <div className="flex items-center gap-1">
      <Button asChild variant="outline" size="icon-sm">
        <Link href={href(prev)} aria-label="Previous month" scroll={false}>
          <ChevronLeft aria-hidden />
        </Link>
      </Button>
      <span className="min-w-32 text-center text-sm font-semibold">{formatISODate(first, "MMMM yyyy")}</span>
      <Button asChild variant="outline" size="icon-sm">
        <Link href={href(next)} aria-label="Next month" scroll={false}>
          <ChevronRight aria-hidden />
        </Link>
      </Button>
    </div>
  );
}
