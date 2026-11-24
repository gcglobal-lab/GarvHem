"use server";

import { revalidatePath } from "next/cache";
import { createAction } from "@/lib/action";
import { leadNoteSchema, moveLeadSchema, updateLeadSchema } from "@/lib/validators/leads";
import { addLeadNote, moveLead, updateLead } from "@/server/leads";

const refresh = () => revalidatePath("/portal/admin/leads", "layout");

export const moveLeadAction = createAction(
  { name: "lead.move", permission: "leads.manage", schema: moveLeadSchema },
  async (input, ctx) => {
    await moveLead(input, ctx);
    refresh();
  },
);
export const updateLeadAction = createAction(
  { name: "lead.update", permission: "leads.manage", schema: updateLeadSchema },
  async (input, ctx) => {
    await updateLead(input, ctx);
    refresh();
  },
);
export const addLeadNoteAction = createAction(
  { name: "lead.note", permission: "leads.manage", schema: leadNoteSchema },
  async (input, ctx) => {
    await addLeadNote(input, ctx);
    refresh();
  },
);
