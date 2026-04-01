import { Card, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { requireTenantContext } from "@/modules/tenant/tenant-context";

export default async function BillingsPage() {
  const tenant = await requireTenantContext();
  const records = await db.billingRecord.findMany({
    where: { organizationId: tenant.organizationId },
    include: { customer: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Billings / Invoices</h1>
      <Card>
        <CardTitle>Billing records</CardTitle>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-3">Reference</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} className="border-b">
                  <td className="py-3">{record.referenceNo}</td>
                  <td>{record.customer.fullName}</td>
                  <td>{record.status}</td>
                  <td>{formatCurrency(record.totalAmount.toString())}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

