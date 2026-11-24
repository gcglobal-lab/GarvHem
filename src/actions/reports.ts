"use server";

import { revalidatePath } from "next/cache";
import { createAction } from "@/lib/action";
import { reportCommentSchema, reportSchema } from "@/lib/validators/reports";
import { commentOnReport, saveReport } from "@/server/reports";

export const saveReportAction = createAction(
  { name: "report.save", limit: { max: 60, seconds: 600 }, permission: "own.reports", schema: reportSchema },
  async (input, ctx) => {
    const result = await saveReport(input, ctx);
    revalidatePath("/portal", "layout");
    return result;
  },
);

export const commentOnReportAction = createAction(
  {
    name: "report.comment",
    limit: { max: 60, seconds: 600 },
    permission: "own.reports",
    schema: reportCommentSchema,
  },
  async (input, ctx) => {
    await commentOnReport(input, ctx);
    revalidatePath(`/portal/reports/${input.reportId}`);
  },
);
