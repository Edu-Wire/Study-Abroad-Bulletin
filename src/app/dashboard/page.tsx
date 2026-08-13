import type { Metadata } from "next";
import { DashboardClient } from "./DashboardClient";

export const metadata: Metadata = {
  title: "Dashboard — Study Abroad Intelligence",
  description: "Your personalised study-abroad dashboard. Saved universities, upcoming deadlines and the latest updates.",
};

export default function DashboardPage() {
  return <DashboardClient />;
}
