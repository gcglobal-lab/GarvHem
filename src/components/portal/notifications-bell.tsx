"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/menu";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/client-api";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";

type Item = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};
type Data = { items: Item[]; unread: number };

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const client = useQueryClient();
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api<Data>("/api/portal/notifications"),
    refetchInterval: 45_000,
  });
  const read = useMutation({
    mutationFn: (id?: string) =>
      api("/api/portal/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      }),
    onError: () => toast.error("Could not update notifications."),
    onSettled: () => client.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const unread = data?.unread ?? 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notifications, ${unread} unread`}
        >
          <Bell aria-hidden />
          {unread > 0 ? (
            <span
              className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] leading-4 font-semibold text-white"
              aria-hidden
            >
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(23rem,calc(100vw-1.5rem))] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="font-display text-sm font-semibold">Notifications</p>
          {unread > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => read.mutate(undefined)} loading={read.isPending}>
              <CheckCheck aria-hidden /> Mark all read
            </Button>
          ) : null}
        </div>
        <ul className="max-h-96 scrollbar-thin overflow-y-auto p-1.5">
          {data?.items.map((n) => (
            <li key={n.id}>
              <button
                onClick={() => {
                  if (!n.readAt) read.mutate(n.id);
                  setOpen(false);
                  if (n.href) router.push(n.href);
                }}
                className="flex w-full gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-surface-2"
              >
                <span
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    n.readAt ? "bg-transparent" : "bg-brand",
                  )}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-sm", !n.readAt && "font-semibold")}>{n.title}</span>
                  {n.body ? (
                    <span className="mt-0.5 line-clamp-2 block text-xs text-muted">{n.body}</span>
                  ) : null}
                  <span className="mt-1 block text-xs text-muted">{timeAgo(n.createdAt)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        {data && !data.items.length ? (
          <p className="px-4 pb-6 text-center text-sm text-muted">You are all caught up.</p>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
