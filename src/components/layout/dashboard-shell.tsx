import type { Route } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/rbac";
import { permissions, type PermissionKey } from "@/modules/authz/permissions";

const nav: ReadonlyArray<{ label: string; href: Route; demoVisible?: boolean; permission?: PermissionKey }> = [
  { label: "Dashboard", href: "/app", demoVisible: true },
  { label: "Organization Settings", href: "/app/settings", permission: permissions.manageOrganizationSettings },
  { label: "Subscription & Billing", href: "/app/subscription", permission: permissions.managePricingAndLimits },
  { label: "WhatsApp Connection", href: "/app/whatsapp", demoVisible: true, permission: permissions.manageWhatsapp },
  { label: "Plans & Pricing", href: "/app/plans", permission: permissions.manageBilling },
  { label: "Customers / Payers", href: "/app/customers", demoVisible: true, permission: permissions.manageCustomers },
  { label: "Imports", href: "/app/imports", demoVisible: true, permission: permissions.manageCustomers },
  { label: "Billings / Invoices", href: "/app/billings", demoVisible: true, permission: permissions.manageBilling },
  { label: "Campaigns", href: "/app/campaigns", demoVisible: true, permission: permissions.createCampaigns },
  { label: "Payment Records", href: "/app/payments", demoVisible: true, permission: permissions.manageBilling },
  { label: "Reports / Analytics", href: "/app/reports", permission: permissions.viewReports },
  { label: "Integrations", href: "/app/integrations", permission: permissions.manageIntegrations },
  { label: "Team / Members", href: "/app/team", permission: permissions.manageTeam },
  { label: "Audit Logs", href: "/app/audit-logs", permission: permissions.viewAuditLogs },
  { label: "Profile Settings", href: "/app/profile" },
];

export async function DashboardShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const primaryOrganizationId = user?.memberships[0]?.organizationId;
  const organization = primaryOrganizationId
    ? await db.organization.findUnique({
        where: { id: primaryOrganizationId },
        select: { slug: true },
      })
    : null;
  const isDemoOrganization = organization?.slug === "demo-tuition-centre";
  const membershipRole = user?.memberships[0]?.role;
  const visibleNav = nav.filter((item) => {
    if (isDemoOrganization && !item.demoVisible) {
      return false;
    }

    if (!item.permission || user?.isPlatformAdmin) {
      return true;
    }

    return membershipRole ? hasPermission(membershipRole, item.permission) : false;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="grid min-h-screen md:grid-cols-[260px_1fr]">
        <aside className="border-r bg-card px-4 py-6">
          <div className="mb-8 px-2">
            <p className="text-sm text-muted-foreground">Signed in as</p>
            <p className="font-semibold">{user?.fullName || "Guest"}</p>
          </div>
          <nav className="space-y-1">
            {visibleNav.map((item) => (
              <Link key={item.href} href={item.href} className="block rounded-xl px-3 py-2 text-sm hover:bg-muted">
                {item.label}
              </Link>
            ))}
            {user?.isPlatformAdmin ? (
              <Link href="/admin" className="block rounded-xl px-3 py-2 text-sm hover:bg-muted">
                Superadmin
              </Link>
            ) : null}
          </nav>
        </aside>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
