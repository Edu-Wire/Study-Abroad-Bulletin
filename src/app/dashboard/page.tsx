import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardClient } from "./DashboardClient";
import { getSessionUser } from "@/lib/server/session";

export const metadata: Metadata = {
  title: "Dashboard — Study Abroad Intelligence",
  description: "Your personalised study-abroad dashboard. Saved universities, upcoming deadlines and the latest updates.",
};

export default async function DashboardPage() {
  const user = await getSessionUser();

  // A temporary password must be replaced before the account is usable, so a
  // non-staff invited user is not stranded here either.
  if (user?.mustChangePassword) {
    redirect("/auth/change-password?required=1&redirect=/dashboard");
  }

  return <DashboardClient />;
}
