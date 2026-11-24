import { z } from "zod";
import { id, text } from "./common";

export const reportSchema = z.object({
  summary: text(5000, 10, "Describe what you did (at least 10 characters)"),
  items: z
    .array(
      z.object({
        taskId: id.nullish(),
        text: text(300).default(""),
        hours: z.number().min(0).max(24).nullish(),
      }),
    )
    .max(30)
    .default([])
    .transform((items) => items.filter((i) => i.taskId || i.text)),
  blockers: text(3000).default(""),
  tomorrowPlan: text(3000).default(""),
  links: z
    .array(
      z
        .string()
        .trim()
        .max(500)
        .regex(/^https?:\/\//i, "Links must start with http:// or https://"),
    )
    .max(10)
    .default([]),
});

export const reportCommentSchema = z.object({ reportId: id, body: text(2000, 1, "Write some feedback") });

export const reportFilterSchema = z.object({
  date: z.string().max(10).catch(""),
  employee: z.string().max(40).catch(""),
});
