import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const securityHeaders = [
  { key: "X-Frame-Options",        value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy",        value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",     value: "camera=(), microphone=(), geolocation=()" },
  ...(!isDev
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js App Router requires unsafe-inline for its streaming runtime scripts
      "script-src 'self' 'unsafe-inline' https://*.clerk.com https://*.clerk.accounts.dev",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co https://img.clerk.com",
      "font-src 'self' data:",
      "connect-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://*.supabase.co wss://*.supabase.co",
      "frame-src https://*.clerk.accounts.dev https://*.clerk.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      ...(!isDev ? ["upgrade-insecure-requests"] : []),
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "img.clerk.com" },
    ],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
