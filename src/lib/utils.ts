import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Only same-site absolute paths survive; everything else becomes the fallback. */
export function safeNext(
  next: string | null | undefined,
  fallback = "/portal",
  prefixes: readonly string[] = ["/portal", "/change-password"],
): string {
  if (!next || next.length > 512) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || /[\\\u0000-\u001f]/.test(next)) return fallback;
  try {
    const url = new URL(next, "http://internal.invalid");
    if (url.origin !== "http://internal.invalid") return fallback;
    if (!prefixes.some((p) => url.pathname === p || url.pathname.startsWith(`${p}/`))) return fallback;
    url.searchParams.delete("_rsc");
    return url.pathname + url.search;
  } catch {
    return fallback;
  }
}

export const formatBytes = (n: number) =>
  n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
