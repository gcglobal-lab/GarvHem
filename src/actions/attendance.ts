"use server";

import { revalidatePath } from "next/cache";
import { createAction } from "@/lib/action";
import { correctionSchema, markReviewedSchema, punchSchema } from "@/lib/validators/attendance";
import { correctDay, markReviewed, punch, todayState } from "@/server/attendance";

export const punchAction = createAction(
  {
    name: "attendance.punch",
    limit: { max: 60, seconds: 600 },
    permission: "own.attendance",
    schema: punchSchema,
  },
  async (input, { user, meta }) => {
    await punch(user, input.action, meta, { skipReport: input.skipReport });
    revalidatePath("/portal", "layout");
    return todayState(user.id);
  },
);

export const correctAttendanceAction = createAction(
  {
    name: "attendance.correct",
    permission: ["team.attendance.view", "team.attendance.edit"],
    schema: correctionSchema,
  },
  async (input, ctx) => {
    await correctDay(input, ctx);
    revalidatePath("/portal/admin/attendance", "layout");
  },
);

export const markReviewedAction = createAction(
  {
    name: "attendance.review",
    permission: ["team.attendance.view", "team.attendance.edit"],
    schema: markReviewedSchema,
  },
  async (input, ctx) => {
    await markReviewed(input.dayId, ctx);
    revalidatePath("/portal/admin/attendance", "layout");
  },
);
