import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ALLOWED_ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "EDITOR"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only run middleware on /admin routes
  if (pathname.startsWith("/admin")) {
    const token = request.cookies.get("auth_token")?.value;
    const role = request.cookies.get("auth_role")?.value;

    // If no token or role is not an authorized admin role, redirect to login
    if (!token || !role || !ALLOWED_ADMIN_ROLES.includes(role)) {
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
