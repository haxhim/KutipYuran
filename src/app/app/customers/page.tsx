import { Card, CardTitle } from "@/components/ui/card";
import { requireTenantContext } from "@/modules/tenant/tenant-context";
import { listCustomers } from "@/modules/customers/customer.service";

export default async function CustomersPage() {
  const tenant = await requireTenantContext();
  const customers = await listCustomers(tenant.organizationId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Customers / Payers</h1>
        <p className="text-muted-foreground">Imported and manually managed payer database.</p>
      </div>
      <Card>
        <CardTitle>Customer list</CardTitle>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-3">Name</th>
                <th>WhatsApp</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className="border-b">
                  <td className="py-3">{customer.fullName}</td>
                  <td>{customer.normalizedWhatsapp}</td>
                  <td>{customer.email || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

