import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Content Security Policy — staged.
 *
 * Shipped as report-only first, deliberately. Next.js injects inline bootstrap
 * scripts and the article editor renders `data:` image previews, so a blocking
 * policy has to be validated against real traffic before it is enforced.
 * Promote this to `Content-Security-Policy` once reports are clean.
 *
 * `connect-src 'self'` is the meaningful line here: browser code only ever
 * calls the same-origin BFF, so no backend host needs to be allowed.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  // 'unsafe-inline' is required by the framework's bootstrap scripts today.
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  ...(isProduction ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  // Never allow the browser to second-guess a declared content type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Legacy clickjacking defence; frame-ancestors above is the modern one.
  { key: "X-Frame-Options", value: "DENY" },
  // Send the origin cross-site, the full path same-origin.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Deny powerful features this application does not use.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  { key: "Content-Security-Policy-Report-Only", value: contentSecurityPolicy },
];

// HSTS only in production: sending it over plain-HTTP local development would
// pin localhost to HTTPS in the developer's browser.
if (isProduction) {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  });
}

const nextConfig: NextConfig = {
  images: {
    // Allow future external image domains
    remotePatterns: [],
  },
  // Strict mode for better development warnings
  reactStrictMode: true,

  // Do not advertise the framework version.
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Proxied API traffic must never be cached by a shared cache.
        source: "/api/backend/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default nextConfig;
