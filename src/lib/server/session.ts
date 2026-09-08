/**
 * Server-side session resolution.
 *
 * Server Components ask Express who the caller is. Express re-reads the session
 * row and the user record, so the answer here reflects revocation, suspension,
 * and role changes immediately — nothing is trusted from the cookie itself
 * beyond its opaque value.
 */

import "server-only";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
  getBackendUrl,
  getBffSharedSecret,
} from "./backendConfig";

export type UserRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "EDITOR"
  | "STUDENT"
  | "CONSULTANT";

export interface SessionUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  status: "ACTIVE" | "INVITED" | "SUSPENDED";
  mustChangePassword?: boolean;
}

/** Roles permitted to render the admin area. */
export const ADMIN_ROLES: readonly UserRole[] = ["EDITOR", "ADMIN", "SUPER_ADMIN"];

/**
 * Resolve the current user via Express, or null when unauthenticated.
 *
 * Returns null on every failure mode — no cookie, rejected session, suspended
 * account, or an unreachable backend — so callers fail closed.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return null;

  let backendUrl: string;
  let sharedSecret: string;
  try {
    backendUrl = getBackendUrl();
    sharedSecret = getBffSharedSecret();
  } catch (error) {
    console.error("[session] backend is not configured:", error);
    return null;
  }

  try {
    const res = await fetch(`${backendUrl}/api/me`, {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-bff-secret": sharedSecret,
        cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data = (await res.json()) as { success?: boolean; user?: SessionUser };
    if (!data?.success || !data.user) return null;

    return data.user;
  } catch (error) {
    console.error("[session] failed to resolve session:", error);
    return null;
  }
}

/** True when the user may render admin routes. */
export function isAdminRole(role: UserRole | undefined): boolean {
  return Boolean(role && ADMIN_ROLES.includes(role));
}
