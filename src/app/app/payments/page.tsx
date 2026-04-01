import { Card, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { requireTenantContext } from "@/modules/tenant/tenant-context";

export default async function PaymentsPage() {
  const tenant = await requireTenantContext();
  const transactions = await db.paymentTransaction.findMany({
    where: { organizationId: tenant.organizationId },
    orderBy: { createdAt: "desc" },
    include: {
      billingRecord: true,
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Payment Records</h1>
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
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="border-b">
                  <td className="py-3">{transaction.provider}</td>
                  <td>{transaction.status}</td>
                  <td>{formatCurrency(transaction.amount.toString())}</td>
                  <td>{transaction.providerReference || transaction.billingRecord.referenceNo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

