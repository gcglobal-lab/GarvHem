"use server";

import { revalidatePath } from "next/cache";
import { createAction } from "@/lib/action";
import {
  commentSchema,
  moveTaskSchema,
  taskIdSchema,
  taskSchema,
  toggleChecklistSchema,
} from "@/lib/validators/tasks";
import {
  addComment,
  createTask,
  deleteTask,
  moveTask,
  taskFeed,
  toggleChecklist,
  updateTask,
} from "@/server/tasks";

const refresh = () => revalidatePath("/portal/tasks", "layout");

export const saveTaskAction = createAction(
  { name: "task.save", limit: { max: 120, seconds: 600 }, permission: "tasks.create", schema: taskSchema },
  async (input, ctx) => {
    const result = input.id ? await updateTask(input.id, input, ctx) : await createTask(input, ctx);
    refresh();
    return result;
  },
);

export const moveTaskAction = createAction(
  { name: "task.move", permission: "own.tasks", schema: moveTaskSchema },
  async (input, ctx) => {
    await moveTask(input, ctx);
    refresh();
  },
);

export const commentOnTaskAction = createAction(
  { name: "task.comment", limit: { max: 60, seconds: 600 }, permission: "own.tasks", schema: commentSchema },
  async (input, ctx) => {
    await addComment(input, ctx);
    return taskFeed(ctx.user, input.taskId);
  },
);

export const toggleChecklistAction = createAction(
  { name: "task.checklist", permission: "own.tasks", schema: toggleChecklistSchema },
  async (input, ctx) => {
    await toggleChecklist(input, ctx);
    refresh();
  },
);

export const deleteTaskAction = createAction(
  { name: "task.delete", permission: "tasks.create", schema: taskIdSchema },
  async (input, ctx) => {
    await deleteTask(input.id, ctx);
    refresh();
  },
);
