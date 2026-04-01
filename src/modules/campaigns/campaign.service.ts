import { BillingRecordStatus, ReminderCampaignStatus, ReminderRecipientStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { enqueueCampaignRecipients, enqueueCampaignStart } from "@/queues";
import { assertCanSendMessages } from "@/modules/saas/saas.service";

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

function getQueuedRecipientStatuses() {
  return [ReminderRecipientStatus.QUEUED, ReminderRecipientStatus.FAILED];
}

export async function createBillingReminderCampaign(args: {
  organizationId: string;
  name: string;
  scheduledAt?: Date | null;
}) {
  const template = await getOrCreateDefaultTemplate(args.organizationId);
  const billings = await db.billingRecord.findMany({
    where: {
      organizationId: args.organizationId,
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

  const shouldSchedule = Boolean(args.scheduledAt && args.scheduledAt.getTime() > Date.now());

  const campaign = await db.$transaction(async (tx) => {
    const created = await tx.reminderCampaign.create({
      data: {
        organizationId: args.organizationId,
        name: args.name,
        status: shouldSchedule ? ReminderCampaignStatus.SCHEDULED : ReminderCampaignStatus.DRAFT,
        messageTemplateId: template.id,
        totalRecipients: recipients.length,
        scheduledAt: shouldSchedule ? args.scheduledAt : null,
      },
    });

    await tx.reminderCampaignRecipient.createMany({
      data: recipients.map((billing) => ({
        organizationId: args.organizationId,
        reminderCampaignId: created.id,
        customerId: billing.customerId,
        billingRecordId: billing.id,
        status: ReminderRecipientStatus.QUEUED,
        dedupeKey: `${created.id}:${billing.customerId}:${billing.id}`,
      })),
    });

    return created;
  });

  if (shouldSchedule && args.scheduledAt) {
    await enqueueCampaignStart({
      campaignId: campaign.id,
      organizationId: args.organizationId,
      delayMs: Math.max(args.scheduledAt.getTime() - Date.now(), 0),
    });
  }

  return campaign;
}

export async function startCampaign(organizationId: string, campaignId: string) {
  const campaign = await db.reminderCampaign.findFirstOrThrow({
    where: { id: campaignId, organizationId },
    include: {
      recipients: {
        where: {
          status: {
            in: getQueuedRecipientStatuses(),
          },
        },
      },
    },
  });

  if (campaign.status === ReminderCampaignStatus.CANCELLED) {
    throw new Error("Cancelled campaigns cannot be started again");
  }

  if (campaign.status === ReminderCampaignStatus.RUNNING) {
    throw new Error("Campaign is already running");
  }

  if (!campaign.recipients.length) {
    throw new Error("This campaign has no queued recipients left to send");
  }

  await assertCanSendMessages(organizationId, campaign.recipients.length);

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

export async function resumeCampaign(organizationId: string, campaignId: string) {
  const campaign = await db.reminderCampaign.findFirstOrThrow({
    where: { id: campaignId, organizationId },
  });

  if (campaign.status !== ReminderCampaignStatus.PAUSED && campaign.status !== ReminderCampaignStatus.SCHEDULED) {
    throw new Error("Only paused or scheduled campaigns can be resumed");
  }

  if (campaign.scheduledAt && campaign.scheduledAt.getTime() > Date.now()) {
    await db.reminderCampaign.update({
      where: { id: campaign.id },
      data: {
        status: ReminderCampaignStatus.SCHEDULED,
      },
    });

    await enqueueCampaignStart({
      campaignId: campaign.id,
      organizationId,
      delayMs: Math.max(campaign.scheduledAt.getTime() - Date.now(), 0),
    });

    return campaign;
  }

  return startCampaign(organizationId, campaignId);
}

export async function cancelCampaign(organizationId: string, campaignId: string) {
  return db.$transaction(async (tx) => {
    await tx.reminderCampaignRecipient.updateMany({
      where: {
        organizationId,
        reminderCampaignId: campaignId,
        status: {
          in: [ReminderRecipientStatus.QUEUED, ReminderRecipientStatus.PROCESSING],
        },
      },
      data: {
        status: ReminderRecipientStatus.CANCELLED,
        lastError: "Campaign cancelled by operator",
      },
    });

    return tx.reminderCampaign.update({
      where: { id: campaignId, organizationId },
      data: {
        status: ReminderCampaignStatus.CANCELLED,
        completedAt: new Date(),
      },
    });
  });
}

export async function retryCampaignFailures(organizationId: string, campaignId: string) {
  const reset = await db.reminderCampaignRecipient.updateMany({
    where: {
      organizationId,
      reminderCampaignId: campaignId,
      status: {
        in: [ReminderRecipientStatus.FAILED, ReminderRecipientStatus.SKIPPED],
      },
    },
    data: {
      status: ReminderRecipientStatus.QUEUED,
      lastError: null,
    },
  });

  if (!reset.count) {
    throw new Error("No failed recipients were available to retry");
  }

  await db.reminderCampaign.update({
    where: { id: campaignId, organizationId },
    data: {
      status: ReminderCampaignStatus.DRAFT,
      completedAt: null,
    },
  });

  return startCampaign(organizationId, campaignId);
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

    const [sentCount, failedCount, activeCount, cancelledCount] = await Promise.all([
      tx.reminderCampaignRecipient.count({
        where: {
          reminderCampaignId: recipient.reminderCampaignId,
          status: { in: [ReminderRecipientStatus.SENT, ReminderRecipientStatus.DELIVERED] },
        },
      }),
      tx.reminderCampaignRecipient.count({
        where: {
          reminderCampaignId: recipient.reminderCampaignId,
          status: { in: [ReminderRecipientStatus.FAILED, ReminderRecipientStatus.SKIPPED] },
        },
      }),
      tx.reminderCampaignRecipient.count({
        where: {
          reminderCampaignId: recipient.reminderCampaignId,
          status: { in: [ReminderRecipientStatus.QUEUED, ReminderRecipientStatus.PROCESSING] },
        },
      }),
      tx.reminderCampaignRecipient.count({
        where: {
          reminderCampaignId: recipient.reminderCampaignId,
          status: ReminderRecipientStatus.CANCELLED,
        },
      }),
    ]);

    const nextStatus =
      activeCount === 0
        ? cancelledCount > 0 && sentCount === 0 && failedCount === 0
          ? ReminderCampaignStatus.CANCELLED
          : ReminderCampaignStatus.COMPLETED
        : ReminderCampaignStatus.RUNNING;

    await tx.reminderCampaign.update({
      where: { id: recipient.reminderCampaignId },
      data: {
        sentCount,
        failedCount,
        status: nextStatus,
        completedAt: activeCount === 0 ? new Date() : null,
      },
    });

    return recipient;
  });
}
