import { db } from "@/lib/db";
import { requireTenantContext } from "@/modules/tenant/tenant-context";
import { listImportJobs } from "@/modules/imports/import.service";
import { ImportsConsole } from "@/app/app/imports/imports-console";

export default async function ImportsPage() {
  const tenant = await requireTenantContext();
  const [feePlans, importJobs] = await Promise.all([
    db.feePlan.findMany({
      where: { organizationId: tenant.organizationId, deletedAt: null, active: true },
      orderBy: { name: "asc" },
      select: { name: true },
    }),
    listImportJobs(tenant.organizationId),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Imports</h1>
      <a href="/templates/customers-template.csv" className="inline-block text-sm font-semibold text-primary">
        Download template
      </a>
      <ImportsConsole
        feePlans={feePlans.map((plan) => plan.name)}
        importJobs={importJobs.map((job) => ({
          id: job.id,
          originalFileName: job.originalFileName,
          status: job.status,
          totalRows: job.totalRows,
          successRows: job.successRows,
          failedRows: job.failedRows,
          createdAt: job.createdAt.toISOString(),
          rowErrors: job.rowErrors.map((error) => ({
            id: error.id,
            rowNumber: error.rowNumber,
            message: error.message,
          })),
        }))}
      />
    </div>
  );
}
