import { db } from "@/lib/db";

export async function getCampaignDetail(
  organizationId: string,
  campaignId: string,
  filters?: {
    status?: string;
    query?: string;
  },
) {
  return db.reminderCampaign.findFirstOrThrow({
    where: {
      id: campaignId,
      organizationId,
    },
    include: {
      messageTemplate: true,
      recipients: {
        where: {
          status: filters?.status && filters.status !== "ALL" ? filters.status as never : undefined,
          OR: filters?.query
            ? [
                { customer: { fullName: { contains: filters.query, mode: "insensitive" } } },
                { customer: { normalizedWhatsapp: { contains: filters.query, mode: "insensitive" } } },
                { billingRecord: { referenceNo: { contains: filters.query, mode: "insensitive" } } },
              ]
            : undefined,
        },
        orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
        include: {
          customer: true,
          billingRecord: true,
          messageLogs: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });
}

export async function exportCampaignRecipientsCsv(
  organizationId: string,
  campaignId: string,
  filters?: {
    status?: string;
    query?: string;
  },
) {
  const campaign = await getCampaignDetail(organizationId, campaignId, filters);
  const rows = [
    ["Recipient", "WhatsApp", "Billing Reference", "Status", "Attempts", "Last Error"],
    ...campaign.recipients.map((recipient) => [
      recipient.customer.fullName,
      recipient.customer.normalizedWhatsapp,
      recipient.billingRecord?.referenceNo || "",
      recipient.status,
      String(recipient.attemptCount),
      recipient.lastError || "",
    ]),
  ];

  return rows
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}
