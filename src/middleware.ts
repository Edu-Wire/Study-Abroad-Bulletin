import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ALLOWED_ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "EDITOR"];

interface JwtPayload {
  userId?: string;
  email?: string;
  role?: string;
  exp?: number;
  [key: string]: unknown;
}

/**
 * Native Web Crypto HMAC-SHA256 JWT Verification.
 * Works universally in Next.js Edge & Node runtimes with zero external dependencies.
 */
async function verifyJwt(token: string, secret: string): Promise<JwtPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    // Decode base64url to binary
    const base64 = signatureB64.replace(/-/g, "+").replace(/_/g, "/");
    const padLength = (4 - (base64.length % 4)) % 4;
    const paddedBase64 = base64 + "=".repeat(padLength);
    const binarySignature = Uint8Array.from(atob(paddedBase64), (c) => c.charCodeAt(0));
    const data = encoder.encode(`${headerB64}.${payloadB64}`);

    const isValid = await crypto.subtle.verify("HMAC", key, binarySignature, data);
    if (!isValid) return null;

    // Decode payload
    const payloadBase64 = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    const payloadPad = (4 - (payloadBase64.length % 4)) % 4;
    const payloadJson = atob(payloadBase64 + "=".repeat(payloadPad));
    const payload: JwtPayload = JSON.parse(payloadJson);

    // Check expiration timestamp (in seconds)
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only run middleware on /admin routes
  if (pathname.startsWith("/admin")) {
    const token = request.cookies.get("auth_token")?.value;

    if (!token) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("[Middleware] Missing JWT_SECRET environment variable.");
      const loginUrl = new URL("/auth/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    const payload = await verifyJwt(token, secret);

    // If token signature is invalid, tampered, or expired -> redirect to login
    if (!payload || !payload.role) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete("auth_token");
      response.cookies.delete("auth_role");
      return response;
    }

    // Check if role extracted directly from cryptographically verified token has admin privileges
    if (!ALLOWED_ADMIN_ROLES.includes(payload.role)) {
      // Non-admin logged in user (e.g. STUDENT) -> redirect to user dashboard
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
