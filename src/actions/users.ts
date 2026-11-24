"use server";

import { revalidatePath } from "next/cache";
import { createAction } from "@/lib/action";
import { createUserSchema, setActiveSchema, updateUserSchema, userIdSchema } from "@/lib/validators/users";
import { createUser, logoutEverywhere, resetUserPassword, setUserActive, updateUser } from "@/server/users";

const refresh = () => revalidatePath("/portal/admin/employees", "layout");

export const createUserAction = createAction(
  { name: "user.create", permission: "users.manage", schema: createUserSchema },
  async (input, ctx) => {
    const result = await createUser(input, ctx);
    refresh();
    return result;
  },
);
export const updateUserAction = createAction(
  { name: "user.update", permission: "users.manage", schema: updateUserSchema },
  async (input, ctx) => {
    await updateUser(input, ctx);
    refresh();
  },
);
export const setUserActiveAction = createAction(
  { name: "user.active", permission: "users.manage", schema: setActiveSchema },
  async (input, ctx) => {
    await setUserActive(input, ctx);
    refresh();
  },
);
export const resetUserPasswordAction = createAction(
  { name: "user.reset", permission: "users.manage", schema: userIdSchema },
  async (input, ctx) => {
    const result = await resetUserPassword(input.id, ctx);
    refresh();
    return result;
  },
);
export const logoutEverywhereAction = createAction(
  { name: "user.logout", permission: "users.manage", schema: userIdSchema },
  async (input, ctx) => {
    await logoutEverywhere(input.id, ctx);
    refresh();
  },
);
