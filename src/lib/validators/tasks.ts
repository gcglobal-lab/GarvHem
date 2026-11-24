import { z } from "zod";
import { id, optionalIsoDate, optionalText, text } from "./common";

export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const;
export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type TaskStatusName = (typeof TASK_STATUSES)[number];
export type TaskPriorityName = (typeof TASK_PRIORITIES)[number];

export const taskSchema = z.object({
  id: id.optional(),
  title: text(160, 3, "Enter a title (at least 3 characters)"),
  description: text(20_000).default(""),
  assigneeIds: z.array(id).max(30).default([]),
  priority: z.enum(TASK_PRIORITIES).default("MEDIUM"),
  dueDate: optionalIsoDate,
  labels: z.array(text(40, 1)).max(12).default([]),
  client: optionalText(120),
  checklist: z
    .array(z.object({ id: id.optional(), text: text(240, 1), done: z.boolean().default(false) }))
    .max(60)
    .default([]),
});

export const moveTaskSchema = z.object({
  id,
  status: z.enum(TASK_STATUSES),
  beforeId: id.nullish(), // the card that should come right after this one
});
export const taskIdSchema = z.object({ id });
export const commentSchema = z.object({ taskId: id, body: text(4000, 1, "Write a comment") });
export const toggleChecklistSchema = z.object({ taskId: id, itemId: id, done: z.boolean() });

export const taskFilterSchema = z.object({
  q: z.string().trim().max(100).catch(""),
  assignee: z.string().max(40).catch(""),
  status: z.enum(["", ...TASK_STATUSES]).catch(""),
  priority: z.enum(["", ...TASK_PRIORITIES]).catch(""),
  label: z.string().max(40).catch(""),
  overdue: z.enum(["", "1"]).catch(""),
});
export type TaskFilter = z.infer<typeof taskFilterSchema>;
