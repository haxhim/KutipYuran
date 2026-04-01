import { Card, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { permissions } from "@/modules/authz/permissions";
import { getReportSummary } from "@/modules/reports/report.service";
import { requireTenantPermission } from "@/modules/tenant/tenant-context";

export default async function ReportsPage() {
  const tenant = await requireTenantPermission(permissions.viewReports);
  const report = await getReportSummary(tenant.organizationId);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Reports / Analytics</h1>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardTitle>Total Billings</CardTitle>
          <p className="mt-4 text-2xl font-semibold">{report.totalBillings}</p>
        </Card>
        <Card>
          <CardTitle>Unpaid Billings</CardTitle>
          <p className="mt-4 text-2xl font-semibold">{report.unpaidBillings}</p>
        </Card>
        <Card>
          <CardTitle>Overdue Billings</CardTitle>
          <p className="mt-4 text-2xl font-semibold">{report.overdueBillings}</p>
        </Card>
        <Card>
          <CardTitle>Paid Payments</CardTitle>
          <p className="mt-4 text-2xl font-semibold">{report.paidPayments}</p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardTitle>Payments By Provider</CardTitle>
          <div className="mt-4 space-y-2 text-sm">
            {report.paymentsByProvider.map((item) => (
              <p key={item.provider}>
                {item.provider}: {item.count}
              </p>
            ))}
          </div>
        </Card>
        <Card>
          <CardTitle>Campaign Summary</CardTitle>
          <div className="mt-4 space-y-2 text-sm">
            <p>Total: {report.campaignSummary.total}</p>
            <p>Completed: {report.campaignSummary.completed}</p>
            <p>Running: {report.campaignSummary.running}</p>
            <p>With failures: {report.campaignSummary.failed}</p>
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle>Plan Assignment Summary</CardTitle>
        <div className="mt-4 space-y-3">
          {report.planSummary.map((plan) => (
            <div key={plan.name} className="rounded-xl bg-muted p-4 text-sm">
              <p className="font-medium">{plan.name}</p>
              <p>Assignments: {plan.assignments}</p>
              <p>Amount: {formatCurrency(plan.amount)}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
