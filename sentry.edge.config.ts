import * as Sentry from "@sentry/nextjs";

// Edge runtime — runs for middleware.ts (Clerk middleware).
// Tracing disabled: edge spans are noisy and the middleware path is not interesting.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === "production",
  tracesSampleRate: 0,
});
