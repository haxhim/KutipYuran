import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { getAdminMonitoringSnapshot } from "@/modules/admin/admin.service";

export default async function AdminPage() {
  const snapshot = await getAdminMonitoringSnapshot();
  const pendingPayoutTotal = snapshot.payouts
    .filter((payout) => payout.status !== "COMPLETED")
    .reduce((sum, payout) => sum + Number(payout.amount), 0);
  const failedQueueCount = snapshot.queueStats.reduce((sum, queue) => sum + (queue.counts.failed || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Superadmin Overview</h1>
        <p className="text-muted-foreground">Platform health, payout exposure, gateway readiness, and recent operational activity.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardTitle>Organizations</CardTitle>
          <p className="mt-3 text-2xl font-semibold">{snapshot.organizations.length}</p>
          <CardDescription className="mt-1">Recent tenants in the current monitoring view</CardDescription>
        </Card>
        <Card>
          <CardTitle>Worker Health</CardTitle>
          <p className="mt-3 text-2xl font-semibold">{snapshot.worker.isHealthy ? "Healthy" : "Missing heartbeat"}</p>
          <CardDescription className="mt-1">
            {snapshot.worker.heartbeat ? `Last heartbeat ${new Date(snapshot.worker.heartbeat).toLocaleString()}` : "No worker heartbeat reported yet"}
          </CardDescription>
        </Card>
        <Card>
          <CardTitle>Failed Queue Jobs</CardTitle>
          <p className="mt-3 text-2xl font-semibold">{failedQueueCount}</p>
          <CardDescription className="mt-1">Failed jobs across delivery, imports, and campaign scheduling queues</CardDescription>
        </Card>
        <Card>
          <CardTitle>Pending Payouts</CardTitle>
          <p className="mt-3 text-2xl font-semibold">{formatCurrency(pendingPayoutTotal)}</p>
          <CardDescription className="mt-1">Requested by tenants and awaiting platform action</CardDescription>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardTitle>Priority Actions</CardTitle>
          <div className="mt-4 grid gap-3">
            <a className="rounded-xl border bg-muted px-4 py-3 text-sm font-medium hover:bg-accent" href="/admin/gateways">
              Review gateway credentials and collection readiness
            </a>
            <a className="rounded-xl border bg-muted px-4 py-3 text-sm font-medium hover:bg-accent" href="/admin/payouts">
              Approve or complete payout requests
            </a>
            <a className="rounded-xl border bg-muted px-4 py-3 text-sm font-medium hover:bg-accent" href="/admin/queues">
              Retry failed queue jobs and inspect backlog
            </a>
            <a className="rounded-xl border bg-muted px-4 py-3 text-sm font-medium hover:bg-accent" href="/admin/webhooks">
              Replay failed gateway callbacks
            </a>
          </div>
        </Card>

        <Card>
          <CardTitle>Live Snapshot</CardTitle>
          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-xl bg-muted p-4">
              <p className="font-medium">Gateway callbacks</p>
              <p className="text-muted-foreground">{snapshot.webhookEvents.length} recent events, with failures and duplicates surfaced in the webhooks panel.</p>
            </div>
            <div className="rounded-xl bg-muted p-4">
              <p className="font-medium">Campaign operations</p>
              <p className="text-muted-foreground">{snapshot.runningCampaigns.length} running, paused, or scheduled campaigns across tenants.</p>
            </div>
            <div className="rounded-xl bg-muted p-4">
              <p className="font-medium">Redis connectivity</p>
              <p className="text-muted-foreground">Current status: {snapshot.worker.redisPing}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardTitle>Recent Organizations</CardTitle>
          <div className="mt-4 space-y-2 text-sm">
            {snapshot.organizations.map((organization) => (
              <div key={organization.id} className="rounded-xl bg-muted p-3">
                <p className="font-medium">{organization.name}</p>
                <p className="text-muted-foreground">{organization.slug}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>Recent Webhook Health</CardTitle>
          <div className="mt-4 space-y-2 text-sm">
            {snapshot.webhookEvents.slice(0, 5).map((event) => (
              <div key={event.id} className="rounded-xl bg-muted p-3">
                <p className="font-medium">{event.provider}</p>
                <div className="mt-1">
                  <Badge>{event.status}</Badge>
                </div>
                <p className="mt-2 text-muted-foreground">{event.eventType}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>Recent Payout Requests</CardTitle>
          <div className="mt-4 space-y-2 text-sm">
            {snapshot.payouts.slice(0, 5).map((payout) => (
              <div key={payout.id} className="rounded-xl bg-muted p-3">
                <p className="font-medium">{payout.organization.name}</p>
                <p>{formatCurrency(payout.amount.toString())}</p>
                <div className="mt-1">
                  <Badge>{payout.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
