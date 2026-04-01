import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { AdminPayoutConsole } from "@/app/admin/payout-console";
import { formatCurrency } from "@/lib/utils";
import { getAdminMonitoringSnapshot } from "@/modules/admin/admin.service";

export default async function AdminPayoutsPage() {
  const snapshot = await getAdminMonitoringSnapshot();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payout Workflow</h1>
        <p className="text-muted-foreground">Approve, reject, and complete tenant reimbursement requests from SaaS-held collections.</p>
      </div>

      <Card>
        <CardTitle>Payout Actions</CardTitle>
        <CardDescription className="mt-2">Use approval and completion actions only after operational checks and bank transfer confirmation.</CardDescription>
        <div className="mt-4">
          <AdminPayoutConsole payoutIds={snapshot.payouts.filter((payout) => payout.status !== "COMPLETED").map((payout) => payout.id)} />
        </div>
      </Card>

      <Card>
        <CardTitle>Payout Requests</CardTitle>
        <div className="mt-4 space-y-3 text-sm">
          {snapshot.payouts.map((payout) => (
            <div className="rounded-xl bg-muted p-4" key={payout.id}>
              <p className="font-medium">{payout.organization.name}</p>
              <p>{payout.status} {formatCurrency(payout.amount.toString())}</p>
              <p className="text-muted-foreground">
                Requested: {new Date(payout.requestedAt).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                {payout.bankName} | {payout.accountName} | {payout.accountNumber}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
