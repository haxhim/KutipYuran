import { getCurrentUser } from "@/lib/auth";
import { AuthenticatedShell } from "@/components/layout/authenticated-shell";

const adminNav: Array<{ label: string; href: string }> = [
  { label: "Overview", href: "/admin" },
  { label: "Pricing Plans", href: "/admin/pricing" },
  { label: "User Database", href: "/admin/users" },
  { label: "Gateway Config", href: "/admin/gateways" },
  { label: "Queues", href: "/admin/queues" },
  { label: "Webhooks", href: "/admin/webhooks" },
  { label: "Payouts", href: "/admin/payouts" },
  { label: "Organizations", href: "/admin/organizations" },
  { label: "Activity", href: "/admin/activity" },
];

export async function AdminShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <AuthenticatedShell
      footerLink={{ label: "Open Tenant App", href: "/app" }}
      nav={adminNav}
      roleLabel="Platform Admin"
      userEmail={user?.email}
      userName={user?.fullName || "Platform Admin"}
    >
      {children}
    </AuthenticatedShell>
  );
}
