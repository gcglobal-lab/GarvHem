import { CalendarClock, CheckSquare, MessageSquare, Paperclip } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AvatarStack } from "@/components/ui/misc";
import { formatISODate } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { TaskCard } from "@/server/tasks";
import { PriorityBadge } from "./status";

export function TaskCardBody({ task }: { task: TaskCard }) {
  return (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="tabular text-xs text-muted">#{task.number}</span>
        <PriorityBadge priority={task.priority} />
      </span>
      <span className="mt-1.5 block text-sm leading-snug font-medium">{task.title}</span>
      {task.labels.length || task.client ? (
        <span className="mt-2 flex flex-wrap gap-1">
          {task.client ? <Badge tone="outline">{task.client}</Badge> : null}
          {task.labels.slice(0, 3).map((l) => (
            <Badge key={l}>{l}</Badge>
          ))}
        </span>
      ) : null}
      <span className="mt-3 flex items-center justify-between gap-2 text-xs text-muted">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 [&_svg]:size-3.5 [&>span]:flex [&>span]:items-center [&>span]:gap-1">
          {task.dueDate ? (
            <span className={cn(task.overdue && "font-semibold text-danger")}>
              <CalendarClock aria-hidden /> {task.overdue ? "Overdue " : ""}
              {formatISODate(task.dueDate, "d MMM")}
            </span>
          ) : null}
          {task.checklistTotal ? (
            <span>
              <CheckSquare aria-hidden /> {task.checklistDone}/{task.checklistTotal}
              <span className="sr-only"> checklist</span>
            </span>
          ) : null}
          {task.comments ? (
            <span>
              <MessageSquare aria-hidden /> {task.comments}
              <span className="sr-only"> comments</span>
            </span>
          ) : null}
          {task.attachments ? (
            <span>
              <Paperclip aria-hidden /> {task.attachments}
              <span className="sr-only"> files</span>
            </span>
          ) : null}
        </span>
        <AvatarStack names={task.assignees.map((a) => a.name)} />
      </span>
    </>
  );
}
