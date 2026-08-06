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
//
// Next.js strips error.message/stack from what reaches the BROWSER in
// production (client only ever sees `digest`) — but this hook runs
// server-side, before that redaction, so the real message/stack ARE
// available here. Log them: this is the only place the actual cause of a
// production crash is recoverable. Search Vercel's function logs for the
// digest shown on the error page to find this line.
export const onRequestError: typeof Sentry.captureRequestError = (error, request, context) => {
  const err = error as Error & { digest?: string };
  console.error("[ERP] Server request error", {
    timestamp:  new Date().toISOString(),
    digest:     err.digest,
    message:    err.message,
    stack:      err.stack,
    route:      (context as { routePath?: string }).routePath,
    routeType:  (context as { routeType?: string }).routeType,
    method:     (request as { method?: string }).method,
    path:       (request as { path?: string }).path,
  });
  return Sentry.captureRequestError(error, request, context);
};
