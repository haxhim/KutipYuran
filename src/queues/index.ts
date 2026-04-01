import { Queue } from "bullmq";
import { redis } from "@/lib/redis";

export const queueNames = {
  whatsappSend: "whatsapp-send",
  billingGeneration: "billing-generation",
  webhookProcessing: "webhook-processing",
  importProcessing: "import-processing",
};

export const whatsappSendQueue = new Queue(queueNames.whatsappSend, { connection: redis });
export const billingGenerationQueue = new Queue(queueNames.billingGeneration, { connection: redis });
export const webhookProcessingQueue = new Queue(queueNames.webhookProcessing, { connection: redis });
export const importProcessingQueue = new Queue(queueNames.importProcessing, { connection: redis });

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

