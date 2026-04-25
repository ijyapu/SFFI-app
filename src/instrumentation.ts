import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

// Forward every Next.js request error to Sentry automatically.
// Covers server actions, API routes, and RSC errors.
export const onRequestError = Sentry.captureRequestError;
