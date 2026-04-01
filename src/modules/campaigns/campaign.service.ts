import { ReminderCampaignStatus, ReminderRecipientStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { enqueueCampaignRecipients } from "@/queues";

export async function startCampaign(organizationId: string, campaignId: string) {
  const campaign = await db.reminderCampaign.findFirstOrThrow({
    where: { id: campaignId, organizationId },
    include: {
      recipients: true,
    },
  });

  await db.reminderCampaign.update({
    where: { id: campaignId },
    data: {
      status: ReminderCampaignStatus.RUNNING,
      startedAt: new Date(),
    },
  });

  await enqueueCampaignRecipients(campaign.recipients.map((recipient) => ({
    campaignId,
    recipientId: recipient.id,
    organizationId,
  })));

  return campaign;
}

export async function pauseCampaign(organizationId: string, campaignId: string) {
  return db.reminderCampaign.update({
    where: { id: campaignId, organizationId },
    data: { status: ReminderCampaignStatus.PAUSED },
  });
}

export async function markRecipientStatus(recipientId: string, status: ReminderRecipientStatus, error?: string) {
  return db.reminderCampaignRecipient.update({
    where: { id: recipientId },
    data: {
      status,
      lastError: error,
      sentAt: status === ReminderRecipientStatus.SENT ? new Date() : undefined,
      attemptCount: { increment: 1 },
    },
  });
}
