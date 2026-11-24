"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import { createAction, parseInput } from "@/lib/action";
import { setSessionCookies } from "@/lib/auth/cookies";
import { toFailure, type ActionResult } from "@/lib/errors";
import { isEmailConfigured } from "@/lib/env";
import { requestMeta } from "@/lib/request";
import { changePasswordSchema, forgotPasswordSchema, resetPasswordSchema } from "@/lib/validators/auth";
import { updateOwnProfileSchema } from "@/lib/validators/users";
import {
  changePassword,
  limitPasswordReset,
  requestPasswordReset,
  resetPasswordWithToken,
} from "@/server/auth";
import { revokeOtherSessions, revokeOwnSession, updateOwnPhone } from "@/server/users";

export const changePasswordAction = createAction(
  { name: "account.password", schema: changePasswordSchema, allowPasswordChange: true },
  async (input, { user, meta }) => {
    const tokens = await changePassword(user.id, input, meta);
    setSessionCookies(await cookies(), tokens);
  },
);

export const updateProfileAction = createAction(
  { name: "account.profile", schema: updateOwnProfileSchema },
  async (input, ctx) => {
    await updateOwnPhone(input.phone, ctx);
    revalidatePath("/portal/profile");
  },
);

export const revokeSessionAction = createAction(
  { name: "account.session", schema: z.object({ familyId: z.uuid() }) },
  async (input, ctx) => {
    await revokeOwnSession(input.familyId, ctx);
    revalidatePath("/portal/profile");
  },
);

export const revokeOtherSessionsAction = createAction(
  { name: "account.sessions", schema: z.object({}) },
  async (_input, ctx) => {
    await revokeOtherSessions(ctx);
    revalidatePath("/portal/profile");
  },
);

/* Public: only useful when an email provider is configured. */

export async function forgotPasswordAction(input: { email: string }): Promise<ActionResult> {
  try {
    if (isEmailConfigured()) {
      const { email } = parseInput(forgotPasswordSchema, input);
      const meta = await requestMeta();
      await limitPasswordReset(email, meta);
      after(() => requestPasswordReset(email, meta).catch((e) => toFailure(e, "account.forgot")));
    }
    return { ok: true, data: undefined };
  } catch (error) {
    const { ok, error: message, code, fieldErrors } = toFailure(error, "account.forgot");
    return { ok, error: message, code, fieldErrors };
  }
}

export async function resetPasswordAction(input: z.input<typeof resetPasswordSchema>): Promise<ActionResult> {
  try {
    await resetPasswordWithToken(parseInput(resetPasswordSchema, input), await requestMeta());
    return { ok: true, data: undefined };
  } catch (error) {
    const { ok, error: message, code, fieldErrors } = toFailure(error, "account.reset");
    return { ok, error: message, code, fieldErrors };
  }
}
