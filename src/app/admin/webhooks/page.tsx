import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { AdminOpsConsole } from "@/app/admin/admin-ops-console";
import { getAdminMonitoringSnapshot } from "@/modules/admin/admin.service";

export default async function AdminWebhooksPage() {
  const snapshot = await getAdminMonitoringSnapshot();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Webhook Monitor</h1>
        <p className="text-muted-foreground">Recent gateway callbacks, duplicate detection, and replay actions.</p>
      </div>

      <Card>
        <CardTitle>Replay Actions</CardTitle>
        <CardDescription className="mt-2">Replay failed or duplicate events after fixing provider or downstream issues.</CardDescription>
        <div className="mt-4">
          <AdminOpsConsole
            failedJobs={[]}
            queueNames={[]}
            webhookIds={snapshot.webhookEvents.filter((event) => event.status === "FAILED" || event.status === "DUPLICATE").map((event) => event.id)}
          />
        </div>
      </Card>

      <Card>
        <CardTitle>Recent Webhook Events</CardTitle>
        <div className="mt-4 space-y-3 text-sm">
          {snapshot.webhookEvents.map((event) => (
            <div className="rounded-xl bg-muted p-4" key={event.id}>
              <p className="font-medium">
                {event.provider} {event.status}
              </p>
              <p>{event.organization?.name || "Unknown organization"}</p>
              <p className="text-muted-foreground">
                Event: {event.eventType} | Ref: {event.externalEventId || "-"} | {new Date(event.createdAt).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">{event.processingError || "No processing error"}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
