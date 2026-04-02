import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { UserDatabaseConsole } from "@/app/admin/users/user-database-console";
import { listAdminPricingPlans, listTenantAccountsForAdmin } from "@/modules/saas/saas.service";

export default async function AdminUsersPage() {
  const [rows, plans] = await Promise.all([listTenantAccountsForAdmin(), listAdminPricingPlans()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Database</h1>
        <p className="text-muted-foreground">Tenant account table with plan assignment, message usage, and ban/deactivate control.</p>
      </div>

      <Card>
        <CardTitle>Tenant Accounts</CardTitle>
        <CardDescription className="mt-2">Name, email, current plan, subscription duration, total message volume, and admin controls.</CardDescription>
        <div className="mt-4">
          <UserDatabaseConsole
            rows={rows.map((row) => ({
              organizationId: row.organization.id,
              organizationName: row.organization.name,
              contactPerson: row.organization.contactPerson,
              ownerFullName: row.owner?.fullName || "",
              ownerEmail: row.owner?.email || "",
              suspended: Boolean(row.organization.suspendedAt),
              currentPlanId: row.subscription?.saasPlanId || "",
              currentDurationDays: row.subscription?.startsAt && row.subscription?.endsAt
                ? Math.max(
                    1,
                    Math.round(
                      (new Date(row.subscription.endsAt).getTime() - new Date(row.subscription.startsAt).getTime()) / (1000 * 60 * 60 * 24),
                    ),
                  )
                : undefined,
              currentPlanName: row.subscription?.saasPlan.name || "-",
              subscriptionStartsAt: row.subscription?.startsAt ? new Date(row.subscription.startsAt).toLocaleDateString() : "-",
              subscriptionEndsAt: row.subscription?.endsAt ? new Date(row.subscription.endsAt).toLocaleDateString() : "-",
              totalPaid: row.totalPaid,
              totalMessagesSent: row.totalMessagesSent,
              statusLabel: row.organization.suspendedAt ? "SUSPENDED" : "ACTIVE",
            }))}
            plans={plans.map((plan) => ({
              id: plan.id,
              name: plan.name,
              billingInterval: plan.billingInterval,
            }))}
          />
        </div>
      </Card>
    </div>
  );
}
