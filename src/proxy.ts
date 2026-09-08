import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Optimistic redirect only.
 *
 * This checks nothing more than whether a session cookie is present, so an
 * anonymous visitor lands on the login page instead of a flash of admin chrome.
 * It is deliberately not an authorization boundary:
 *
 *  - the cookie is an opaque token, so there is nothing here to decode,
 *  - no database or backend call is made, per the Proxy execution model,
 *  - a present-but-invalid cookie still reaches the admin layout, which asks
 *    Express who the user is and denies them there.
 *
 * The authoritative checks live in src/app/admin/layout.tsx (server-side role
 * check via Express) and in Express itself for every API call.
 */

// Mirrors backend/src/config/session.js. Browsers reject `__Host-` cookies over
// plain HTTP, so development uses the unprefixed name.
const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === "production"
    ? "__Host-abroad_session"
    : "abroad_session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    const hasSession = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);

    if (!hasSession) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
