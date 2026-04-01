"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export function AdminOpsConsole({
  queueNames,
  webhookIds,
  failedJobs,
}: {
  queueNames: string[];
  webhookIds: string[];
  failedJobs: Array<{ queueName: string; jobId: string; label: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState("");

  async function replayWebhook(webhookEventId: string) {
    setStatusMessage("");
    const response = await fetch(`/api/admin/webhooks/${webhookEventId}/replay`, { method: "POST" });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setStatusMessage(payload?.error || "Failed to replay webhook.");
      return;
    }
    setStatusMessage("Webhook replay completed.");
    startTransition(() => router.refresh());
  }

  async function retryQueue(queueName: string) {
    setStatusMessage("");
    const response = await fetch(`/api/admin/queues/${queueName}/retry-failed`, { method: "POST" });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setStatusMessage(payload?.error || "Failed to retry queue jobs.");
      return;
    }
    setStatusMessage(`Retried ${payload?.retried || 0} failed job(s) in ${queueName}.`);
    startTransition(() => router.refresh());
  }

  async function retryJob(queueName: string, jobId: string) {
    setStatusMessage("");
    const response = await fetch(`/api/admin/queues/${queueName}/jobs/${jobId}/retry`, { method: "POST" });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setStatusMessage(payload?.error || "Failed to retry queue job.");
      return;
    }
    setStatusMessage(`Retried job ${jobId} in ${queueName}.`);
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {queueNames.map((queueName) => (
          <Button disabled={isPending} key={queueName} onClick={() => retryQueue(queueName)} type="button" variant="outline">
            Retry Failed {queueName}
          </Button>
        ))}
        {failedJobs.slice(0, 10).map((job) => (
          <Button disabled={isPending} key={`${job.queueName}-${job.jobId}`} onClick={() => retryJob(job.queueName, job.jobId)} type="button" variant="outline">
            Retry Job {job.label}
          </Button>
        ))}
        {webhookIds.slice(0, 5).map((webhookId) => (
          <Button disabled={isPending} key={webhookId} onClick={() => replayWebhook(webhookId)} type="button">
            Replay Webhook {webhookId.slice(0, 6)}
          </Button>
        ))}
      </div>
      {statusMessage ? <div className="rounded-xl border bg-card px-4 py-3 text-sm">{statusMessage}</div> : null}
    </div>
  );
}
