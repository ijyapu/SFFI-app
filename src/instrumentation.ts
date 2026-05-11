import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

// Wraps Sentry's captureRequestError to also write a structured log line
// that appears in Vercel Function logs (stdout/stderr).
export const onRequestError: typeof Sentry.captureRequestError = (error, request, context) => {
  // In production, error.message is intentionally omitted by Next.js.
  // Only the digest (a stable hash) and route context are safe to log.
  console.error("[ERP] Server request error", {
    timestamp:  new Date().toISOString(),
    digest:     (error as Error & { digest?: string }).digest,
    route:      (context as { routePath?: string }).routePath,
    routeType:  (context as { routeType?: string }).routeType,
    method:     (request as { method?: string }).method,
    path:       (request as { path?: string }).path,
  });
  return Sentry.captureRequestError(error, request, context);
};
