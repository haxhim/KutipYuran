import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getCurrentUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.isPlatformAdmin) redirect("/admin");
  if (user.memberships.length === 0) redirect("/login");
  return <DashboardShell>{children}</DashboardShell>;
}
