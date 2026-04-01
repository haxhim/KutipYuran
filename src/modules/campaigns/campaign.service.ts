import { BillingRecordStatus, ReminderCampaignStatus, ReminderRecipientStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { enqueueCampaignRecipients } from "@/queues";

async function getOrCreateDefaultTemplate(organizationId: string) {
  const existing = await db.messageTemplate.findFirst({
    where: { organizationId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  if (existing) {
    return existing;
  }

  return db.messageTemplate.create({
    data: {
      organizationId,
      name: "Default Reminder",
      body:
        "Hi {{name}}, saya {{sender_name}} dari {{organization_name}} ingin mengingatkan anda tentang bayaran sebanyak {{amount_due}} untuk rujukan {{reference_no}}. Mohon selesaikan bayaran sebelum {{due_date}}. {{payment_link}}",
      language: "ms",
      isDefault: true,
    },
  });
}

export async function createBillingReminderCampaign(organizationId: string, name: string) {
  const template = await getOrCreateDefaultTemplate(organizationId);
  const billings = await db.billingRecord.findMany({
    where: {
      organizationId,
      status: {
        in: [
          BillingRecordStatus.PENDING,
          BillingRecordStatus.SENT,
          BillingRecordStatus.UNPAID,
          BillingRecordStatus.OVERDUE,
          BillingRecordStatus.PARTIAL,
        ],
      },
      customer: {
        deletedAt: null,
      },
    },
    include: {
      customer: true,
    },
    orderBy: { dueDate: "asc" },
  });

  const recipients = billings.filter((billing) => Boolean(billing.customer.normalizedWhatsapp));
  if (!recipients.length) {
    throw new Error("No unpaid billings with valid WhatsApp numbers were found");
  }

  return db.$transaction(async (tx) => {
    const campaign = await tx.reminderCampaign.create({
      data: {
        organizationId,
        name,
        status: ReminderCampaignStatus.DRAFT,
        messageTemplateId: template.id,
        totalRecipients: recipients.length,
      },
    });

    await tx.reminderCampaignRecipient.createMany({
      data: recipients.map((billing) => ({
        organizationId,
        reminderCampaignId: campaign.id,
        customerId: billing.customerId,
        billingRecordId: billing.id,
        status: ReminderRecipientStatus.QUEUED,
        dedupeKey: `${campaign.id}:${billing.customerId}:${billing.id}`,
      })),
    });

    return campaign;
  });
}

export async function startCampaign(organizationId: string, campaignId: string) {
  const campaign = await db.reminderCampaign.findFirstOrThrow({
    where: { id: campaignId, organizationId },
    include: {
      recipients: {
        where: {
          status: {
            in: [ReminderRecipientStatus.QUEUED, ReminderRecipientStatus.FAILED],
          },
        },
      },
    },
  });

  if (!campaign.recipients.length) {
    throw new Error("This campaign has no queued recipients left to send");
  }

  await db.reminderCampaign.update({
    where: { id: campaignId },
    data: {
      status: ReminderCampaignStatus.RUNNING,
      startedAt: new Date(),
      completedAt: null,
    },
  });

  await enqueueCampaignRecipients(
    campaign.recipients.map((recipient) => ({
      campaignId,
      recipientId: recipient.id,
      organizationId,
    })),
  );

  return campaign;
}

export async function pauseCampaign(organizationId: string, campaignId: string) {
  return db.reminderCampaign.update({
    where: { id: campaignId, organizationId },
    data: { status: ReminderCampaignStatus.PAUSED },
  });
}

export async function markRecipientStatus(recipientId: string, status: ReminderRecipientStatus, error?: string) {
  return db.$transaction(async (tx) => {
    const recipient = await tx.reminderCampaignRecipient.update({
      where: { id: recipientId },
      data: {
        status,
        lastError: error,
        sentAt: status === ReminderRecipientStatus.SENT ? new Date() : undefined,
        attemptCount: { increment: 1 },
      },
    });

    const [sentCount, failedCount, activeCount] = await Promise.all([
      tx.reminderCampaignRecipient.count({
        where: {
          reminderCampaignId: recipient.reminderCampaignId,
          status: { in: [ReminderRecipientStatus.SENT, ReminderRecipientStatus.DELIVERED] },
        },
      }),
      tx.reminderCampaignRecipient.count({
        where: {
          reminderCampaignId: recipient.reminderCampaignId,
          status: { in: [ReminderRecipientStatus.FAILED, ReminderRecipientStatus.SKIPPED, ReminderRecipientStatus.CANCELLED] },
        },
      }),
      tx.reminderCampaignRecipient.count({
        where: {
          reminderCampaignId: recipient.reminderCampaignId,
          status: { in: [ReminderRecipientStatus.QUEUED, ReminderRecipientStatus.PROCESSING] },
        },
      }),
    ]);

    await tx.reminderCampaign.update({
      where: { id: recipient.reminderCampaignId },
      data: {
        sentCount,
        failedCount,
        status: activeCount === 0 ? ReminderCampaignStatus.COMPLETED : ReminderCampaignStatus.RUNNING,
        completedAt: activeCount === 0 ? new Date() : null,
      },
    });

    return recipient;
  });
}
