import "server-only";
import type { z } from "zod";
import { requirePermission, requireUser, type CurrentUser } from "./auth/guards";
import type { Permission } from "./auth/permissions";
import { AppError, toFailure, type ActionResult } from "./errors";
import { enforceLimit } from "./rate-limit";
import { requestMeta, type RequestMeta } from "./request";

export type ActionContext = { user: CurrentUser; meta: RequestMeta };

export function parseInput<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const parsed = schema.safeParse(input);
  if (parsed.success) return parsed.data;
  const fieldErrors: Record<string, string> = {};
  for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] ??= issue.message;
  const first = parsed.error.issues[0]?.message ?? "Please check the form.";
  throw new AppError("VALIDATION", first, fieldErrors);
}

/**
 * Every Server Action goes through here: authenticate, authorise, validate, run, and
 * translate errors into a safe result. Origin checks are done by Next.js itself.
 */
export function createAction<S extends z.ZodType, R>(
  options: {
    name: string;
    permission?: Permission | Permission[];
    schema: S;
    allowPasswordChange?: boolean;
    /** Per user: at most `max` calls in `seconds`. */
    limit?: { max: number; seconds: number };
  },
  handler: (input: z.output<S>, ctx: ActionContext) => Promise<R>,
) {
  return async (input: z.input<S>): Promise<ActionResult<R>> => {
    try {
      const required = options.permission === undefined ? [] : [options.permission].flat();
      const user = required.length
        ? await requirePermission(...required)
        : await requireUser({ allowPasswordChange: options.allowPasswordChange });
      if (options.limit)
        await enforceLimit(`action:${options.name}:${user.id}`, options.limit.max, options.limit.seconds);
      const data = await handler(parseInput(options.schema, input), { user, meta: await requestMeta() });
      return { ok: true, data };
    } catch (error) {
      const { ok, error: message, code, fieldErrors } = toFailure(error, options.name);
      return { ok, error: message, code, fieldErrors };
    }
  };
}
