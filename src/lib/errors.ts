export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "PASSWORD_CHANGE_REQUIRED"
  | "REPORT_REQUIRED";

const STATUS: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 422,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  PASSWORD_CHANGE_REQUIRED: 403,
  REPORT_REQUIRED: 409,
};

/** An error whose message is safe to show to the user. Everything else is reported generically. */
export class AppError extends Error {
  readonly status: number;
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
    this.status = STATUS[code];
  }
}

export const notFound = (what = "Record") => new AppError("NOT_FOUND", `${what} not found.`);
export const invalid = (message: string, fieldErrors?: Record<string, string>) =>
  new AppError("VALIDATION", message, fieldErrors);
export const conflict = (message: string) => new AppError("CONFLICT", message);
export const forbiddenError = () => new AppError("FORBIDDEN", "You do not have permission to do that.");

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: ErrorCode | "INTERNAL"; fieldErrors?: Record<string, string> };

export const GENERIC_ERROR = "Something went wrong. Please try again.";

export function toFailure(
  error: unknown,
  where: string,
): Extract<ActionResult, { ok: false }> & { status: number } {
  if (error instanceof AppError) {
    return {
      ok: false,
      error: error.message,
      code: error.code,
      fieldErrors: error.fieldErrors,
      status: error.status,
    };
  }
  console.error(`[${where}]`, error instanceof Error ? `${error.name}: ${error.message}` : "unknown error");
  return { ok: false, error: GENERIC_ERROR, code: "INTERNAL", status: 500 };
}
