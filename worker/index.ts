import { Worker } from "bullmq";
import { ImportJobStatus, MessageDirection, Prisma, ReminderRecipientStatus, WebhookStatus, WhatsAppSessionStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { renderMessageTemplate } from "@/lib/template";
import { queueNames } from "@/queues";
import { markRecipientStatus } from "@/modules/campaigns/campaign.service";
import { sendWhatsappMessage } from "@/modules/whatsapp/whatsapp.service";
import { generateBillingForCustomer } from "@/modules/billing/billing.service";

new Worker(
  queueNames.whatsappSend,
  async (job) => {
    const recipient = await db.reminderCampaignRecipient.findUniqueOrThrow({
      where: { id: job.data.recipientId },
      include: {
        customer: true,
        reminderCampaign: {
          include: { messageTemplate: true },
        },
        billingRecord: {
          include: { items: true },
        },
        organization: {
          include: {
            whatsappSessions: true,
          },
        },
      },
    });

    const session = recipient.organization.whatsappSessions.find((item) => item.status === WhatsAppSessionStatus.CONNECTED);
    const template = recipient.reminderCampaign.messageTemplate;
    if (!session || !template || !recipient.billingRecord) {
      await markRecipientStatus(recipient.id, ReminderRecipientStatus.SKIPPED, "Missing session, template, or billing");
      return;
    }

    const planSummary = recipient.billingRecord.items.map((item) => `${item.title} x${item.quantity}`).join(", ");
    const body = renderMessageTemplate({
      body: template.body,
      customer: recipient.customer,
      organization: recipient.organization,
      billingRecord: {
        ...recipient.billingRecord,
        planSummary,
      },
    });

    try {
      const result = await sendWhatsappMessage(session.sessionKey, recipient.customer.normalizedWhatsapp, body);

      await db.messageLog.create({
        data: {
          organizationId: recipient.organizationId,
          customerId: recipient.customerId,
          reminderCampaignId: recipient.reminderCampaignId,
          recipientId: recipient.id,
          whatsappSessionId: session.id,
          direction: MessageDirection.OUTBOUND,
          phoneNumber: recipient.customer.normalizedWhatsapp,
          messageBody: body,
          providerMessageId: result.id?._serialized,
          status: "sent",
          sentAt: new Date(),
        },
      });

      await markRecipientStatus(recipient.id, ReminderRecipientStatus.SENT);
    } catch (error) {
      await markRecipientStatus(recipient.id, ReminderRecipientStatus.FAILED, (error as Error).message);
      throw error;
    }
  },
  { connection: redis },
);

new Worker(
  queueNames.billingGeneration,
  async (job) => {
    const { organizationId, customerId, dueDate } = job.data as {
      organizationId: string;
      customerId: string;
      dueDate: string;
    };

    await generateBillingForCustomer(organizationId, customerId, new Date(dueDate));
  },
  { connection: redis },
);

new Worker(
  queueNames.webhookProcessing,
  async (job) => {
    const { webhookEventId } = job.data as { webhookEventId: string };
    await db.webhookEvent.update({
      where: { id: webhookEventId },
      data: {
        status: WebhookStatus.PROCESSED,
        processedAt: new Date(),
      },
    });
  },
  { connection: redis },
);

new Worker(
  queueNames.importProcessing,
  async (job) => {
    const { importJobId } = job.data as { importJobId: string };
    await db.importJob.update({
      where: { id: importJobId },
      data: {
        status: ImportJobStatus.COMPLETED,
      },
    });
  },
  { connection: redis },
);

console.log("KutipYuran worker is running");
