import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { requireTenantContext } from "@/modules/tenant/tenant-context";
import { getDashboardMetrics } from "@/modules/billing/billing.service";

export default async function AppDashboardPage() {
  const tenant = await requireTenantContext();
  const metrics = await getDashboardMetrics(tenant.organizationId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Automated billing, reminders, and wallet visibility for your organization.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total billed" value={formatCurrency(metrics.totalBilled)} description="All generated billing records" />
        <StatCard title="Collected" value={formatCurrency(metrics.totalCollected)} description="Paid amount across all billings" />
        <StatCard title="Unpaid" value={formatCurrency(metrics.totalUnpaid)} description="Outstanding balance still due" />
        <StatCard title="Overdue" value={formatCurrency(metrics.overdueAmount)} description="Bills past their due date" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Wallet</CardTitle>
          <div className="mt-4 space-y-2 text-sm">
            <p>Available: {formatCurrency(metrics.wallet?.availableBalance.toString() || 0)}</p>
            <p>Pending: {formatCurrency(metrics.wallet?.pendingBalance.toString() || 0)}</p>
            <p>Total earned: {formatCurrency(metrics.wallet?.totalEarned.toString() || 0)}</p>
            <p>Total withdrawn: {formatCurrency(metrics.wallet?.totalWithdrawn.toString() || 0)}</p>
          </div>
        </Card>
        <Card>
          <CardTitle>Recent payments</CardTitle>
          <div className="mt-4 space-y-3 text-sm">
            {metrics.recentTransactions.map((transaction) => (
              <div key={transaction.id} className="rounded-xl bg-muted p-3">
                <p className="font-medium">{transaction.billingRecord.customer.fullName}</p>
                <p>{formatCurrency(transaction.amount.toString())}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

