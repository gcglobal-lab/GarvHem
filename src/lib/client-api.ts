"use client";

let refreshing: Promise<boolean> | null = null;

/** Rotates the session once, even when several tabs or requests ask at the same moment. */
export function refreshSession(): Promise<boolean> {
  refreshing ??= (async () => {
    const call = async () => (await fetch("/api/auth/refresh", { method: "POST" })).ok;
    try {
      return navigator.locks ? await navigator.locks.request("gv-refresh", call) : await call();
    } catch {
      return false;
    } finally {
      setTimeout(() => (refreshing = null), 1000);
    }
  })();
  return refreshing;
}

export const toLogin = () =>
  window.location.assign(
    `/login?reason=expired&next=${encodeURIComponent(window.location.pathname + window.location.search)}`,
  );

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** JSON fetch for /api/portal: refreshes an expired access token once, then retries. */
export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  let res = await fetch(url, init);
  if (res.status === 401 && (await refreshSession())) res = await fetch(url, init);
  if (res.status === 401) {
    toLogin();
    throw new ApiError("Your session has ended.", 401);
  }
  const body = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok) throw new ApiError(body?.error ?? "Something went wrong. Please try again.", res.status);
  return body as T;
}
