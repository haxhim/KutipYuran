import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { AdminOpsConsole } from "@/app/admin/admin-ops-console";
import { getAdminMonitoringSnapshot } from "@/modules/admin/admin.service";

export default async function AdminQueuesPage() {
  const snapshot = await getAdminMonitoringSnapshot();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Queue Monitor</h1>
        <p className="text-muted-foreground">BullMQ backlog, failed jobs, and queue-level recovery actions.</p>
      </div>

      <Card>
        <CardTitle>Queue Actions</CardTitle>
        <CardDescription className="mt-2">Retry failed jobs in bulk or one-by-one without leaving the admin surface.</CardDescription>
        <div className="mt-4">
          <AdminOpsConsole
            failedJobs={snapshot.queueStats.flatMap((queue) =>
              queue.failedJobs.map((job) => ({
                queueName: queue.name,
                jobId: job.id,
                label: `${queue.name}:${job.id}`,
              })),
            )}
            queueNames={snapshot.queueStats.filter((queue) => (queue.counts.failed || 0) > 0).map((queue) => queue.name)}
            webhookIds={[]}
          />
        </div>
      </Card>

      <Card>
        <CardTitle>Queues</CardTitle>
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
                <th>Recent Failures</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.queueStats.map((queue) => (
                <tr className="border-b" key={queue.name}>
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
    </div>
  );
}
