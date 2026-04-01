import { db } from "@/lib/db";
import { requireTenantContext } from "@/modules/tenant/tenant-context";
import { ImportsConsole } from "@/app/app/imports/imports-console";

export default async function ImportsPage() {
  const tenant = await requireTenantContext();
  const feePlans = await db.feePlan.findMany({
    where: { organizationId: tenant.organizationId, deletedAt: null, active: true },
    orderBy: { name: "asc" },
    select: { name: true },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Imports</h1>
      <a href="/templates/customers-template.csv" className="inline-block text-sm font-semibold text-primary">
        Download template
      </a>
      <ImportsConsole feePlans={feePlans.map((plan) => plan.name)} />
    </div>
  );
}
