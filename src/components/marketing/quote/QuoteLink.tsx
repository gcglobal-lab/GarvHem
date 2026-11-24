"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { useQuote, type QuotePrefill } from "./QuoteProvider";

/** Opens the enquiry dialog. Without JavaScript, or with a modified click, it is a plain link to /contact. */
export function QuoteLink({
  service,
  role,
  onClick,
  ...props
}: Omit<ComponentProps<typeof Link>, "href"> & QuotePrefill) {
  const { open, preload } = useQuote();
  const onContact = usePathname() === "/contact";
  const params = new URLSearchParams();
  if (service) params.set("service", service);
  if (role) params.set("role", role);
  const query = params.toString();
  return (
    <Link
      {...props}
      href={query ? `/contact?${query}` : "/contact"}
      onPointerEnter={preload}
      onFocus={preload}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        if (onContact) {
          const form = document.getElementById("enquiry");
          form?.scrollIntoView({ block: "start" });
          form?.querySelector<HTMLInputElement>("input:not([tabindex='-1'])")?.focus({ preventScroll: true });
        } else {
          e.currentTarget.focus({ preventScroll: true });
          open({ service, role });
        }
      }}
    />
  );
}
