"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History } from "lucide-react";
import { useRef, useState } from "react";
import { commentOnTaskAction } from "@/actions/tasks";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/misc";
import { Textarea } from "@/components/ui/form";
import { toast } from "@/components/ui/toast";
import { api, toLogin } from "@/lib/client-api";
import { formatDateTime, timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { FeedItem } from "@/server/tasks";
import { usePortal } from "./providers";

type Person = { id: string; name: string };

/** Wraps @mentions of known people. Plain text only: nothing here is HTML. */
function withMentions(body: string, people: Person[]) {
  const names = people.flatMap((p) => [p.name, p.name.split(/\s+/)[0]!]).sort((a, b) => b.length - a.length);
  if (!names.length) return body;
  const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return body.split(new RegExp(`(@(?:${escaped.join("|")})(?![\\p{L}\\p{N}_]))`, "giu")).map((part, i) =>
    i % 2 ? (
      <span key={i} className="rounded bg-accent-soft px-1 font-medium text-accent">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

export function TaskFeed({
  taskId,
  initial,
  people,
}: {
  taskId: string;
  initial: FeedItem[];
  people: Person[];
}) {
  const { userId, name, timezone } = usePortal();
  const client = useQueryClient();
  const key = ["task-feed", taskId];
  const { data: feed } = useQuery({
    queryKey: key,
    queryFn: () => api<FeedItem[]>(`/api/portal/tasks/${taskId}/feed`),
    initialData: initial,
    refetchInterval: 20_000,
  });

  const send = useMutation({
    mutationFn: async (body: string) => {
      const r = await commentOnTaskAction({ taskId, body });
      if (!r.ok) {
        if (r.code === "UNAUTHENTICATED") toLogin();
        throw new Error(r.error);
      }
      return r.data;
    },
    onMutate: async (body) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<FeedItem[]>(key);
      client.setQueryData<FeedItem[]>(key, (old = []) => [
        ...old,
        {
          id: `pending-${Date.now()}`,
          kind: "comment",
          author: { id: userId, name },
          body,
          createdAt: new Date().toISOString(),
        },
      ]);
      return { previous };
    },
    onError: (e, body, context) => {
      client.setQueryData(key, context?.previous);
      setText(body); // give the words back
      toast.error(e.message);
    },
    onSuccess: (data) => {
      client.setQueryData(key, data);
      toast.success("Comment added.");
    },
  });

  const [text, setText] = useState("");
  const [highlight, setHighlight] = useState(0);
  const area = useRef<HTMLTextAreaElement>(null);
  const query = /(?:^|\s)@([\p{L}\p{N} ]{0,30})$/u.exec(text)?.[1];
  const matches =
    query === undefined
      ? []
      : people
          .filter((p) => p.id !== userId && p.name.toLowerCase().startsWith(query.toLowerCase()))
          .slice(0, 5);

  const pick = (p: Person) => {
    setText((t) => t.replace(/@[\p{L}\p{N} ]{0,30}$/u, `@${p.name} `));
    setHighlight(0);
    area.current?.focus();
  };
  const submit = () => {
    const body = text.trim();
    if (!body || send.isPending) return;
    setText("");
    send.mutate(body);
  };

  return (
    <div>
      <ul className="space-y-5" aria-live="polite">
        {feed.map((f) =>
          f.kind === "comment" ? (
            <li key={f.id} className={cn("flex gap-3", f.id.startsWith("pending-") && "opacity-60")}>
              <Avatar name={f.author?.name ?? "?"} />
              <div className="min-w-0 flex-1 rounded-xl rounded-tl-sm bg-surface-2 px-3.5 py-2.5">
                <p className="flex flex-wrap items-baseline gap-x-2 text-sm font-semibold">
                  {f.author?.name ?? "Former user"}
                  <time
                    dateTime={f.createdAt}
                    title={formatDateTime(f.createdAt, timezone)}
                    className="text-xs font-normal text-muted"
                    suppressHydrationWarning
                  >
                    {timeAgo(f.createdAt)}
                  </time>
                </p>
                <p className="mt-0.5 text-sm break-words whitespace-pre-line">
                  {withMentions(f.body, people)}
                </p>
              </div>
            </li>
          ) : (
            <li key={f.id} className="flex items-center gap-3 text-[13px] text-muted">
              <span className="grid size-8 shrink-0 place-items-center">
                <History className="size-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="font-medium text-foreground">{f.author?.name ?? "System"}</span> {f.body}{" "}
                <time
                  dateTime={f.createdAt}
                  title={formatDateTime(f.createdAt, timezone)}
                  className="text-xs"
                  suppressHydrationWarning
                >
                  {timeAgo(f.createdAt)}
                </time>
              </span>
            </li>
          ),
        )}
      </ul>
      <form
        className="relative mt-6"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {matches.length ? (
          <ul
            className="absolute bottom-full left-0 z-20 mb-1 w-64 rounded-xl border border-border bg-surface p-1.5 shadow-lift"
            role="listbox"
            aria-label="Mention someone"
          >
            {matches.map((p, i) => (
              <li
                key={p.id}
                role="option"
                aria-selected={i === highlight}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(p);
                }}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm",
                  i === highlight && "bg-surface-2",
                )}
              >
                <Avatar name={p.name} className="size-6 text-[10px]" /> {p.name}
              </li>
            ))}
          </ul>
        ) : null}
        <Textarea
          ref={area}
          aria-label="Write a comment"
          placeholder="Write a comment. Use @ to mention someone."
          value={text}
          maxLength={4000}
          onChange={(e) => {
            setText(e.target.value);
            setHighlight(0);
          }}
          onKeyDown={(e) => {
            if (matches.length && (e.key === "Enter" || e.key === "Tab")) {
              e.preventDefault();
              pick(matches[highlight]!);
            } else if (matches.length && e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((h) => (h + 1) % matches.length);
            } else if (matches.length && e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => (h - 1 + matches.length) % matches.length);
            } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="hidden text-xs text-muted sm:block">Ctrl + Enter to send</span>
          <Button type="submit" className="ml-auto" disabled={!text.trim()} loading={send.isPending}>
            Comment
          </Button>
        </div>
      </form>
    </div>
  );
}
