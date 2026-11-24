export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { env } = await import("@/lib/env");
    const e = env(); // fail fast on missing configuration
    if (e.NODE_ENV === "production" && !process.env.VERCEL && !e.TRUST_PROXY)
      console.warn(
        "[startup] TRUST_PROXY is off: client IPs are unknown and IP rate limits are shared by everyone.",
      );
  }
}
