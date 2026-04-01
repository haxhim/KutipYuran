import { Queue } from "bullmq";
import { redis } from "@/lib/redis";

export const queueNames = {
  whatsappSend: "whatsapp-send",
  campaignStart: "campaign-start",
  billingGeneration: "billing-generation",
  webhookProcessing: "webhook-processing",
  importProcessing: "import-processing",
};

const queueCache = new Map<string, Queue>();

function getQueue(name: string) {
  if (!queueCache.has(name)) {
    queueCache.set(name, new Queue(name, { connection: redis }));
  }

  return queueCache.get(name)!;
}

function createQueueProxy(name: string) {
  return new Proxy({} as Queue, {
    get(_target, property, receiver) {
      const queue = getQueue(name);
      const value = Reflect.get(queue, property, receiver);
      return typeof value === "function" ? value.bind(queue) : value;
    },
  });
}

export const whatsappSendQueue = createQueueProxy(queueNames.whatsappSend);
export const campaignStartQueue = createQueueProxy(queueNames.campaignStart);
export const billingGenerationQueue = createQueueProxy(queueNames.billingGeneration);
export const webhookProcessingQueue = createQueueProxy(queueNames.webhookProcessing);
export const importProcessingQueue = createQueueProxy(queueNames.importProcessing);

export async function enqueueCampaignRecipients(items: Array<{ campaignId: string; recipientId: string; organizationId: string }>) {
  return whatsappSendQueue.addBulk(
    items.map((item, index) => ({
      name: "send-campaign-message",
      data: item,
      opts: {
        delay: index * 5000,
        attempts: 5,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: 1000,
        removeOnFail: 1000,
      },
    })),
  );
}

export async function enqueueCampaignStart(item: {
  campaignId: string;
  organizationId: string;
  delayMs?: number;
}) {
  return campaignStartQueue.add("start-campaign", item, {
    delay: item.delayMs || 0,
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: 1000,
    removeOnFail: 1000,
  });
}

export async function enqueueImportProcessing(item: { importJobId: string }) {
  return importProcessingQueue.add("process-import-job", item, {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 3000,
    },
    removeOnComplete: 1000,
    removeOnFail: 1000,
  });
}
