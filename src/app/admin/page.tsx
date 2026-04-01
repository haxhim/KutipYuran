import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { AdminOpsConsole } from "@/app/admin/admin-ops-console";
import { AdminPayoutConsole } from "@/app/admin/payout-console";
import { IntegrationConsole } from "@/app/app/integrations/integration-console";
import { getCurrentUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { getAdminMonitoringSnapshot } from "@/modules/admin/admin.service";
import { listGlobalProviderConfigs } from "@/modules/integrations/integration.service";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user?.isPlatformAdmin) {
    return <div>Forbidden</div>;
  }

  const snapshot = await getAdminMonitoringSnapshot();
  const globalProviderConfigs = await listGlobalProviderConfigs();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Superadmin</h1>
        <p className="text-muted-foreground">Platform oversight for tenants, payments, webhooks, queues, and worker health.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardTitle>Organizations</CardTitle>
          <p className="mt-3 text-2xl font-semibold">{snapshot.organizations.length}</p>
          <CardDescription className="mt-1">Most recent tenant signups in view</CardDescription>
        </Card>
        <Card>
          <CardTitle>Worker Health</CardTitle>
          <p className="mt-3 text-2xl font-semibold">{snapshot.worker.isHealthy ? "Healthy" : "Missing heartbeat"}</p>
          <CardDescription className="mt-1">
            {snapshot.worker.heartbeat ? `Last heartbeat ${new Date(snapshot.worker.heartbeat).toLocaleString()}` : "No worker heartbeat yet"}
          </CardDescription>
        </Card>
        <Card>
          <CardTitle>Webhook Events</CardTitle>
          <p className="mt-3 text-2xl font-semibold">{snapshot.webhookEvents.length}</p>
          <CardDescription className="mt-1">Recent incoming webhook records</CardDescription>
        </Card>
        <Card>
          <CardTitle>Active Campaigns</CardTitle>
          <p className="mt-3 text-2xl font-semibold">{snapshot.runningCampaigns.length}</p>
          <CardDescription className="mt-1">Running, paused, or scheduled campaigns</CardDescription>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardTitle>Gateway Provider Control</CardTitle>
          <CardDescription className="mt-2">
            Configure SaaS-controlled gateway credentials for the payout flow: payer to KutipYuran, then payout to tenant.
          </CardDescription>
          <div className="mt-4">
            <IntegrationConsole
              initialConfigs={globalProviderConfigs.map((config) => ({
                id: config.id,
                provider: config.provider,
                isEnabled: config.isEnabled,
                isGlobal: config.isGlobal,
                updatedAt: config.updatedAt,
                decryptedConfig: config.decryptedConfig,
              }))}
              providers={["CHIP", "TOYYIBPAY"]}
              savePath="/api/admin/integrations"
              testPath="/api/admin/integrations/test"
            />
          </div>
        </Card>

        <Card>
          <CardTitle>Queue Monitoring</CardTitle>
          <CardDescription className="mt-2">BullMQ backlog and worker-facing queue states.</CardDescription>
          <div className="mt-4">
            <AdminOpsConsole
              queueNames={snapshot.queueStats.filter((queue) => (queue.counts.failed || 0) > 0).map((queue) => queue.name)}
              webhookIds={snapshot.webhookEvents.filter((event) => event.status === "FAILED" || event.status === "DUPLICATE").map((event) => event.id)}
              failedJobs={snapshot.queueStats.flatMap((queue) =>
                queue.failedJobs.map((job) => ({
                  queueName: queue.name,
                  jobId: job.id,
                  label: `${queue.name}:${job.id}`,
                })),
              )}
            />
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-3">Queue</th>
                  <th>Waiting</th>
                  <th>Active</th>
                  <th>Delayed</th>
                  <th>Failed</th>
                  <th>Completed</th>
                  <th>Failed Jobs</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.queueStats.map((queue) => (
                  <tr key={queue.name} className="border-b">
                    <td className="py-3 font-medium">{queue.name}</td>
                    <td>{queue.counts.waiting || 0}</td>
                    <td>{queue.counts.active || 0}</td>
                    <td>{queue.counts.delayed || 0}</td>
                    <td>{queue.counts.failed || 0}</td>
                    <td>{queue.counts.completed || 0}</td>
                    <td className="max-w-sm whitespace-pre-wrap break-words text-xs text-muted-foreground">
                      {queue.failedJobs.length
                        ? queue.failedJobs.map((job) => `${job.name}: ${job.failedReason || "Unknown failure"}`).join("\n")
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardTitle>Webhook Monitor</CardTitle>
          <CardDescription className="mt-2">Recent gateway callbacks and their processing state.</CardDescription>
          <div className="mt-4 space-y-3 text-sm">
            {snapshot.webhookEvents.map((event) => (
              <div key={event.id} className="rounded-xl bg-muted p-3">
                <p className="font-medium">{event.provider} {event.status}</p>
                <p>{event.organization?.name || "Unknown organization"}</p>
                <p className="text-muted-foreground">
                  Event: {event.eventType} | Ref: {event.externalEventId || "-"} | {new Date(event.createdAt).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">{event.processingError || "No processing error"}</p>
                {(event.status === "FAILED" || event.status === "DUPLICATE") ? (
                  <p className="mt-2 text-xs font-medium text-primary">Replay available above in admin actions.</p>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardTitle>Organizations</CardTitle>
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
          <CardTitle>Payout Approvals</CardTitle>
          <div className="mt-4">
            <AdminPayoutConsole payoutIds={snapshot.payouts.filter((payout) => payout.status !== "COMPLETED").map((payout) => payout.id)} />
          </div>
          <div className="mt-4 space-y-2 text-sm">
            {snapshot.payouts.map((payout) => (
              <div key={payout.id} className="rounded-xl bg-muted p-3">
                <p className="font-medium">{payout.organization.name}</p>
                <p>{payout.status} {formatCurrency(payout.amount.toString())}</p>
                <p className="text-muted-foreground">{new Date(payout.requestedAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardTitle>Incoming Payments</CardTitle>
          <div className="mt-4 space-y-2 text-sm">
            {snapshot.transactions.map((transaction) => (
              <div key={transaction.id} className="rounded-xl bg-muted p-3">
                <p className="font-medium">{transaction.organization.name}</p>
                <p>{transaction.provider} {transaction.status}</p>
                <p>{transaction.billingRecord.referenceNo}</p>
                <p className="text-muted-foreground">{new Date(transaction.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardTitle>Import Jobs</CardTitle>
          <div className="mt-4 space-y-2 text-sm">
            {snapshot.importJobs.map((job) => (
              <div key={job.id} className="rounded-xl bg-muted p-3">
                <p className="font-medium">{job.organization.name}</p>
                <p>{job.originalFileName}</p>
                <p>Status: {job.status} | Success: {job.successRows} | Failed: {job.failedRows}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardTitle>Campaign Operations</CardTitle>
          <div className="mt-4 space-y-2 text-sm">
            {snapshot.runningCampaigns.map((campaign) => (
              <div key={campaign.id} className="rounded-xl bg-muted p-3">
                <p className="font-medium">{campaign.organization.name}</p>
                <p>{campaign.name}</p>
                <p>Status: {campaign.status} | Sent: {campaign.sentCount} | Failed: {campaign.failedCount}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
