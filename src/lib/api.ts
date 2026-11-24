import "server-only";
import { NextResponse } from "next/server";
import { AppError, toFailure } from "./errors";

/** Wraps a route handler so that errors become safe JSON with the right status. */
export function handler<A extends unknown[]>(
  name: string,
  fn: (req: Request, ...rest: A) => Promise<Response>,
) {
  return async (req: Request, ...rest: A): Promise<Response> => {
    try {
      return await fn(req, ...rest);
    } catch (error) {
      const { status, error: message, code, fieldErrors } = toFailure(error, name);
      return NextResponse.json(
        { ok: false, error: message, code, fieldErrors },
        { status, headers: { "Cache-Control": "no-store" } },
      );
    }
  };
}

export const json = (data: unknown, init?: ResponseInit) =>
  NextResponse.json(data, { ...init, headers: { "Cache-Control": "private, no-store", ...init?.headers } });

export async function readJson(req: Request, maxBytes = 64_000): Promise<unknown> {
  const text = await req.text();
  if (text.length > maxBytes) throw new AppError("VALIDATION", "The request is too large.");
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new AppError("VALIDATION", "Invalid request body.");
  }
}
