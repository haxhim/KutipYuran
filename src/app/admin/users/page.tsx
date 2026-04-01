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
            organizations={rows.map((row) => ({
              organizationId: row.organization.id,
              suspended: Boolean(row.organization.suspendedAt),
            }))}
            plans={plans.map((plan) => ({
              id: plan.id,
              name: plan.name,
              billingInterval: plan.billingInterval,
            }))}
          />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-3">Name</th>
                <th>Email</th>
                <th>Plan Pick</th>
                <th>Duration</th>
                <th>Total Message Send</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr className="border-b" key={row.organization.id}>
                  <td className="py-3">{row.organization.name}</td>
                  <td>{row.owner?.email || "-"}</td>
                  <td>{row.subscription?.saasPlan.name || "-"}</td>
                  <td>
                    {row.subscription?.startsAt ? new Date(row.subscription.startsAt).toLocaleDateString() : "-"}
                    {" -> "}
                    {row.subscription?.endsAt ? new Date(row.subscription.endsAt).toLocaleDateString() : "-"}
                  </td>
                  <td>{row.totalMessagesSent}</td>
                  <td>{row.organization.suspendedAt ? "SUSPENDED" : "ACTIVE"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
