"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAction } from "@/lib/action";
import { isoDate } from "@/lib/validators/common";
import {
  adjustBalanceSchema,
  applyLeaveSchema,
  bulkAllocateSchema,
  cancelLeaveSchema,
  decideLeaveSchema,
  leaveTypeSchema,
} from "@/lib/validators/leaves";
import { idSchema } from "@/lib/validators/settings";
import {
  adjustBalance,
  applyLeave,
  bulkAllocate,
  cancelLeave,
  decideLeave,
  deleteLeaveType,
  previewLeave,
  saveLeaveType,
} from "@/server/leaves";

const refresh = () => revalidatePath("/portal", "layout");

export const previewLeaveAction = createAction(
  {
    name: "leave.preview",
    permission: "own.leaves",
    schema: z
      .object({ from: isoDate, to: isoDate, firstHalfDay: z.boolean(), lastHalfDay: z.boolean() })
      .refine((v) => Date.parse(v.to) - Date.parse(v.from) < 400 * 86_400_000, "That range is too long"),
  },
  (input) => previewLeave(input),
);

export const applyLeaveAction = createAction(
  {
    name: "leave.apply",
    limit: { max: 10, seconds: 3600 },
    permission: "own.leaves",
    schema: applyLeaveSchema,
  },
  async (input, { user }) => {
    const result = await applyLeave(user, input);
    refresh();
    return result;
  },
);

export const cancelLeaveAction = createAction(
  {
    name: "leave.cancel",
    limit: { max: 20, seconds: 3600 },
    permission: "own.leaves",
    schema: cancelLeaveSchema,
  },
  async (input, ctx) => {
    await cancelLeave(input.id, ctx);
    refresh();
  },
);

export const decideLeaveAction = createAction(
  { name: "leave.decide", permission: "leaves.approve", schema: decideLeaveSchema },
  async (input, ctx) => {
    await decideLeave(input, ctx);
    refresh();
  },
);

export const adjustBalanceAction = createAction(
  { name: "leave.adjust", permission: "leaves.adjustBalance", schema: adjustBalanceSchema },
  async (input, ctx) => {
    const result = await adjustBalance(input, ctx);
    refresh();
    return result;
  },
);

/** Touches every employee, so it needs company-wide rights as well. */
export const bulkAllocateAction = createAction(
  { name: "leave.bulk", permission: ["leaves.adjustBalance", "settings.manage"], schema: bulkAllocateSchema },
  async (input, ctx) => {
    const result = await bulkAllocate(input, ctx);
    refresh();
    return result;
  },
);

export const saveLeaveTypeAction = createAction(
  { name: "leavetype.save", permission: "settings.manage", schema: leaveTypeSchema },
  async (input, ctx) => {
    const result = await saveLeaveType(input, ctx);
    refresh();
    return result;
  },
);

export const deleteLeaveTypeAction = createAction(
  { name: "leavetype.delete", permission: "settings.manage", schema: idSchema },
  async (input, ctx) => {
    await deleteLeaveType(input.id, ctx);
    refresh();
  },
);
