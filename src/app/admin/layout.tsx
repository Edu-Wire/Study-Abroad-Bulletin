import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { getSessionUser, isAdminRole } from "@/lib/server/session";

export const metadata: Metadata = {
  title: "Admin Panel | Abroad Bulletin",
  description: "Management portal and content intelligence dashboard for Abroad Bulletin.",
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Authoritative admin guard.
 *
 * Unlike the proxy — which only notices whether a cookie exists — this asks
 * Express to resolve the session and returns the live role. A student, a
 * suspended account, or a stale cookie never renders admin markup.
 *
 * This is a rendering gate, not the only one: every API call the admin UI makes
 * is independently authorized by Express, so bypassing the UI gains nothing.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth/login?redirect=/admin");
  }

  if (!isAdminRole(user.role)) {
    // Authenticated but not staff — send them to their own dashboard.
    redirect("/dashboard");
  }

  // An administrator-issued temporary password must be replaced first. Express
  // already refuses this user's privileged API calls, so rendering the admin
  // shell would only produce a page whose every request fails.
  if (user.mustChangePassword) {
    redirect("/auth/change-password?required=1&redirect=/admin");
  }

  return <AdminShell>{children}</AdminShell>;
}
