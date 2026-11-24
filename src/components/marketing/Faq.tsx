import { Plus } from "lucide-react";
import type { FaqItem } from "@/config/faq";
import { cn } from "@/lib/utils";
import styles from "./faq.module.css";

/** Native details: works without JavaScript, and find-in-page opens the right answer. */
export function Faq({
  items,
  name = "faq",
  className,
}: {
  items: readonly FaqItem[];
  name?: string;
  className?: string;
}) {
  return (
    <div className={cn("divide-y divide-border border-y border-border", className)}>
      {items.map((f, i) => (
        <details key={f.question} name={name} open={i === 0} className={cn(styles.item, "group")}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 font-display text-lg font-semibold tracking-tight [&::-webkit-details-marker]:hidden">
            {f.question}
            <Plus
              className="size-5 shrink-0 text-muted transition-transform duration-300 group-open:rotate-45"
              aria-hidden
            />
          </summary>
          <p className="max-w-2xl pb-7 leading-relaxed text-muted">{f.answer}</p>
        </details>
      ))}
    </div>
  );
}
