import type { Route } from "next";
import { getCurrentUser } from "@/lib/auth";
import { AuthenticatedShell } from "@/components/layout/authenticated-shell";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/rbac";
import { permissions, type PermissionKey } from "@/modules/authz/permissions";

const nav: ReadonlyArray<{ label: string; href: Route; demoVisible?: boolean; permission?: PermissionKey }> = [
  { label: "Dashboard", href: "/app", demoVisible: true },
  { label: "Settings", href: "/app/settings", permission: permissions.manageOrganizationSettings },
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
  { label: "Audit Logs", href: "/app/audit-logs", permission: permissions.viewAuditLogs },
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
    <AuthenticatedShell
      footerLink={user?.isPlatformAdmin ? { label: "Open Superadmin", href: "/admin" } : undefined}
      nav={visibleNav.map((item) => ({ label: item.label, href: item.href }))}
      roleLabel="Tenant User"
      userEmail={user?.email}
      userName={user?.fullName || "Guest"}
    >
      {children}
    </AuthenticatedShell>
  );
}
