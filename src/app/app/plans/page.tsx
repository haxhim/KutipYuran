import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PlansConsole } from "@/app/app/plans/plans-console";
import { permissions } from "@/modules/authz/permissions";
import { listFeePlans } from "@/modules/fee-plans/fee-plan.service";
import { requireTenantPermission } from "@/modules/tenant/tenant-context";

export default async function PlansPage() {
  const tenant = await requireTenantPermission(permissions.manageBilling);
  const plans = await listFeePlans(tenant.organizationId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Plans & Pricing</h1>
        <p className="text-muted-foreground">Keep customer plans simple and easy to manage.</p>
      </div>
      <Card>
        <CardTitle>Fee Plans</CardTitle>
        <CardDescription className="mt-2">Create a plan with just a name, short description, and amount.</CardDescription>
        <div className="mt-4">
          <PlansConsole
            plans={plans.map((plan) => ({
              id: plan.id,
              name: plan.name,
              description: plan.description,
              amount: plan.amount.toString(),
              billingType: plan.billingType,
              dueDayOfMonth: plan.dueDayOfMonth,
              dueIntervalDays: plan.dueIntervalDays,
              notes: plan.notes,
              active: plan.active,
              currency: plan.currency,
            }))}
          />
        </div>
      </Card>
    </div>
  );
}
