import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { industries } from "@/config/industries";

export function IndustriesList() {
  return (
    <ul className="border-t border-border lg:columns-2 lg:gap-x-14">
      {industries.map((i) => (
        <li key={i.slug} className="break-inside-avoid border-b border-border">
          <Link href={`/industries#${i.slug}`} className="group flex items-center gap-5 py-6">
            <span className="min-w-0 flex-1">
              <span className="block font-display text-xl font-semibold tracking-tight transition-colors group-hover:text-brand sm:text-2xl">
                {i.name}
              </span>
              <span className="mt-1 block text-[15px] text-muted">{i.summary}</span>
            </span>
            <ArrowRight
              className="size-5 shrink-0 text-muted transition-[translate,color] duration-300 group-hover:translate-x-1.5 group-hover:text-brand"
              aria-hidden
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
