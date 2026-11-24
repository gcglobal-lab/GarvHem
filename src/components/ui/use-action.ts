"use client";

import { useState } from "react";
import type { ActionResult } from "@/lib/errors";
import { toast } from "./toast";

type Options<R> = {
  success?: string | ((data: R) => string);
  onSuccess?: (data: R) => void;
  /** Return true when the failure was handled, to skip the error toast. */
  onError?: (failure: Extract<ActionResult, { ok: false }>) => boolean | void;
};

/** Runs a Server Action with pending state, toasts and session-expiry handling. */
export function useAction<I, R>(action: (input: I) => Promise<ActionResult<R>>, options: Options<R> = {}) {
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function run(input: I): Promise<ActionResult<R>> {
    setPending(true);
    setFieldErrors({});
    try {
      const result = await action(input);
      if (result.ok) {
        const message =
          typeof options.success === "function" ? options.success(result.data) : options.success;
        if (message) toast.success(message);
        options.onSuccess?.(result.data);
        return result;
      }
      if (result.code === "UNAUTHENTICATED") {
        window.location.assign(`/login?reason=expired&next=${encodeURIComponent(window.location.pathname)}`);
        return result;
      }
      setFieldErrors(result.fieldErrors ?? {});
      if (!options.onError?.(result)) toast.error(result.error);
      return result;
    } catch {
      const failure = {
        ok: false,
        error: "Could not reach the server. Please try again.",
        code: "INTERNAL",
      } as const;
      if (!options.onError?.(failure)) toast.error(failure.error);
      return failure;
    } finally {
      setPending(false);
    }
  }

  return { run, pending, fieldErrors, clearErrors: () => setFieldErrors({}) };
}
