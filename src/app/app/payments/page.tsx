import { Card, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { permissions } from "@/modules/authz/permissions";
import { listPaymentTransactions } from "@/modules/payments/payment-ops.service";
import { requireTenantPermission } from "@/modules/tenant/tenant-context";
import { PaymentsFilterBar } from "@/app/app/payments/payments-filter-bar";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ provider?: string; status?: string; query?: string }>;
}) {
  const tenant = await requireTenantPermission(permissions.manageBilling);
  const filters = await searchParams;
  const transactions = await listPaymentTransactions(tenant.organizationId, filters);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Payment Records</h1>
      <PaymentsFilterBar />
      <Card>
        <CardTitle>Transactions</CardTitle>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-3">Provider</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Reference</th>
                <th>Customer</th>
                <th>Proofs</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="border-b">
                  <td className="py-3">
                    <a className="font-medium text-primary" href={`/app/payments/${transaction.id}`}>
                      {transaction.provider}
                    </a>
                  </td>
                  <td>{transaction.status}</td>
                  <td>{formatCurrency(transaction.amount.toString())}</td>
                  <td>{transaction.providerReference || transaction.billingRecord.referenceNo}</td>
                  <td>{transaction.billingRecord.customer.fullName}</td>
                  <td>{transaction.manualPaymentProofs.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
