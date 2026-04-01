import { Queue } from "bullmq";
import { PaymentProvider } from "@prisma/client";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { queueNames } from "@/queues";
import { processGatewayWebhook } from "@/modules/payments/payment.service";

async function getQueueStats(name: string) {
  const queue = new Queue(name, { connection: redis });
  try {
    const counts = await queue.getJobCounts("waiting", "active", "completed", "failed", "delayed", "paused");
    const failedJobs = await queue.getFailed(0, 4);
    return {
      name,
      counts,
      failedJobs: failedJobs.map((job) => ({
        id: String(job.id),
        name: job.name,
        failedReason: job.failedReason,
        attemptsMade: job.attemptsMade,
      })),
    };
  } finally {
    await queue.close();
  }
}

export async function getAdminMonitoringSnapshot() {
  const [
    organizations,
    payouts,
    transactions,
    webhookEvents,
    importJobs,
    runningCampaigns,
    workerHeartbeat,
    redisPing,
    queueStats,
  ] = await Promise.all([
    db.organization.findMany({ take: 10, orderBy: { createdAt: "desc" } }),
    db.payoutRequest.findMany({ take: 10, orderBy: { createdAt: "desc" }, include: { organization: true } }),
    db.paymentTransaction.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { organization: true, billingRecord: true },
    }),
    db.webhookEvent.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: { organization: true },
    }),
    db.importJob.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { organization: true },
    }),
    db.reminderCampaign.findMany({
      where: { status: { in: ["RUNNING", "SCHEDULED", "PAUSED"] } },
      take: 10,
      orderBy: { updatedAt: "desc" },
      include: { organization: true },
    }),
    redis.get("worker:heartbeat"),
    redis.ping(),
    Promise.all(Object.values(queueNames).map((name) => getQueueStats(name))),
  ]);

  return {
    organizations,
    payouts,
    transactions,
    webhookEvents,
    importJobs,
    runningCampaigns,
    worker: {
      heartbeat: workerHeartbeat,
      redisPing,
      isHealthy: Boolean(workerHeartbeat),
    },
    queueStats,
  };
}

export async function retryFailedQueueJobs(queueName: string) {
  if (!Object.values(queueNames).includes(queueName as never)) {
    throw new Error("Unknown queue");
  }

  const queue = new Queue(queueName, { connection: redis });
  try {
    const failedJobs = await queue.getFailed();
    for (const job of failedJobs) {
      await job.retry().catch(() => null);
    }
    return { retried: failedJobs.length };
  } finally {
    await queue.close();
  }
}

export async function retryFailedQueueJob(queueName: string, jobId: string) {
  if (!Object.values(queueNames).includes(queueName as never)) {
    throw new Error("Unknown queue");
  }

  const queue = new Queue(queueName, { connection: redis });
  try {
    const job = await queue.getJob(jobId);
    if (!job) {
      throw new Error("Queue job not found");
    }
    await job.retry();
    return { retried: true, jobId };
  } finally {
    await queue.close();
  }
}

export async function replayWebhookEvent(webhookEventId: string) {
  const event = await db.webhookEvent.findUniqueOrThrow({
    where: { id: webhookEventId },
  });

  return processGatewayWebhook({
    provider: event.provider as PaymentProvider,
    headers: new Headers((event.requestHeaders as Record<string, string> | null) || {}),
    payload: event.payload,
  });
}
