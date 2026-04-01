import { Card, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { PlansConsole } from "@/app/app/plans/plans-console";
import { permissions } from "@/modules/authz/permissions";
import { listFeePlans } from "@/modules/fee-plans/fee-plan.service";
import { requireTenantPermission } from "@/modules/tenant/tenant-context";

export default async function PlansPage() {
  const tenant = await requireTenantPermission(permissions.manageBilling);
  const plans = await listFeePlans(tenant.organizationId);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Plans & Pricing</h1>
      <Card>
        <CardTitle>Fee Plans</CardTitle>
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
            }))}
          />
        </div>
        <div className="mt-4 space-y-3">
          {plans.map((plan) => (
            <div key={plan.id} className="rounded-xl bg-muted p-4 text-sm">
              <p className="font-medium">{plan.name}</p>
              <p>Description: {plan.description || "-"}</p>
              <p>Amount: {formatCurrency(plan.amount.toString(), plan.currency)}</p>
              <p>Type: {plan.billingType}</p>
              <p>Active: {plan.active ? "Yes" : "No"}</p>
              <p>Assignments: {plan.assignments.length}</p>
              <p>Notes: {plan.notes || "-"}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
