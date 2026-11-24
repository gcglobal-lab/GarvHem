import "server-only";
import { notFound } from "next/navigation";
import { AppError } from "./errors";

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Flat string params: repeated keys keep their first value. */
export async function flatParams(params: SearchParams): Promise<Record<string, string>> {
  return Object.fromEntries(
    Object.entries(await params).flatMap(([k, v]) => {
      const value = Array.isArray(v) ? v[0] : v;
      return value === undefined ? [] : [[k, value]];
    }),
  );
}

/** Turns a service's "not found" into the 404 page. */
export async function orNotFound<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
}
