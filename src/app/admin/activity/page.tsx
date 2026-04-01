import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getAdminMonitoringSnapshot } from "@/modules/admin/admin.service";

export default async function AdminActivityPage() {
  const snapshot = await getAdminMonitoringSnapshot();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Platform Activity</h1>
        <p className="text-muted-foreground">Recent incoming payments and active tenant campaign operations.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardTitle>Incoming Payments</CardTitle>
          <CardDescription className="mt-2">Latest payment transactions flowing into the platform-controlled gateway layer.</CardDescription>
          <div className="mt-4 space-y-2 text-sm">
            {snapshot.transactions.map((transaction) => (
              <div className="rounded-xl bg-muted p-3" key={transaction.id}>
                <p className="font-medium">{transaction.organization.name}</p>
                <p>{transaction.provider} {transaction.status}</p>
                <p>{transaction.billingRecord.referenceNo}</p>
                <p className="text-muted-foreground">{new Date(transaction.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>Campaign Operations</CardTitle>
          <CardDescription className="mt-2">Running, paused, and scheduled campaigns across all tenant organizations.</CardDescription>
          <div className="mt-4 space-y-2 text-sm">
            {snapshot.runningCampaigns.map((campaign) => (
              <div className="rounded-xl bg-muted p-3" key={campaign.id}>
                <p className="font-medium">{campaign.organization.name}</p>
                <p>{campaign.name}</p>
                <p className="text-muted-foreground">Status: {campaign.status} | Sent: {campaign.sentCount} | Failed: {campaign.failedCount}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
