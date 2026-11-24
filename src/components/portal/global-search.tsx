"use client";

import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useId, useRef, useState } from "react";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/utils";

type Hit = { group: string; title: string; subtitle: string; href: string };

/** Combobox search across tasks, people and leads. "/" focuses it. */
export function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const term = useDeferredValue(q.trim());
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const { data: hits = [], isFetching } = useQuery({
    queryKey: ["search", term],
    queryFn: () => api<Hit[]>(`/api/portal/search?q=${encodeURIComponent(term)}`),
    enabled: term.length >= 2,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === "/" && !/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && !el.isContentEditable) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (hit: Hit | undefined) => {
    if (!hit) return;
    setOpen(false);
    setQ("");
    input.current?.blur();
    router.push(hit.href);
  };
  const visible = open && term.length >= 2;

  return (
    <div
      className="relative min-w-0 flex-1 sm:max-w-sm"
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}
    >
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
        aria-hidden
      />
      <input
        ref={input}
        type="search"
        role="combobox"
        aria-label="Search tasks, people and leads"
        aria-expanded={visible}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={visible && hits[index] ? `${listId}-${index}` : undefined}
        placeholder="Search"
        value={q}
        maxLength={80}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setIndex(0);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") setIndex((i) => Math.min(i + 1, hits.length - 1));
          else if (e.key === "ArrowUp") setIndex((i) => Math.max(i - 1, 0));
          else if (e.key === "Enter") go(hits[index]);
          else if (e.key === "Escape") setOpen(false);
          else return;
          e.preventDefault();
        }}
        className="h-10 w-full rounded-xl border border-transparent bg-surface-2 pr-3 pl-9 text-sm placeholder:text-muted focus:border-input focus:bg-surface focus:outline-none"
      />
      {visible ? (
        <div className="absolute top-12 left-0 z-40 w-full min-w-72 rounded-xl border border-border bg-surface p-1.5 shadow-lift">
          <ul id={listId} role="listbox" aria-label="Search results">
            {hits.map((h, i) => (
              <li
                key={h.href}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === index}
                onMouseDown={(e) => {
                  e.preventDefault();
                  go(h);
                }}
                onMouseEnter={() => setIndex(i)}
                className={cn("cursor-pointer rounded-lg px-3 py-2", i === index && "bg-surface-2")}
              >
                <span className="block truncate text-sm font-medium">{h.title}</span>
                <span className="block truncate text-xs text-muted">
                  {h.group}
                  {h.subtitle ? `, ${h.subtitle}` : ""}
                </span>
              </li>
            ))}
          </ul>
          {!hits.length ? (
            <p className="px-3 py-2 text-sm text-muted">{isFetching ? "Searching…" : "Nothing found."}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
