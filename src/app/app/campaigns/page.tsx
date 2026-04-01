import { BillingRecordStatus, WhatsAppSessionStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireTenantContext } from "@/modules/tenant/tenant-context";
import { CampaignsConsole } from "@/app/app/campaigns/campaigns-console";

export default async function CampaignsPage() {
  const tenant = await requireTenantContext();
  const [campaigns, eligibleBillings, connectedSessions] = await Promise.all([
    db.reminderCampaign.findMany({
      where: { organizationId: tenant.organizationId },
      orderBy: { createdAt: "desc" },
    }),
    db.billingRecord.count({
      where: {
        organizationId: tenant.organizationId,
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
    }),
    db.whatsAppSession.count({
      where: {
        organizationId: tenant.organizationId,
        status: WhatsAppSessionStatus.CONNECTED,
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Campaigns</h1>
      <CampaignsConsole
        campaigns={campaigns.map((campaign) => ({
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          totalRecipients: campaign.totalRecipients,
          sentCount: campaign.sentCount,
          failedCount: campaign.failedCount,
          createdAt: campaign.createdAt.toISOString(),
          scheduledAt: campaign.scheduledAt?.toISOString() || null,
        }))}
        connectedSessions={connectedSessions}
        eligibleBillings={eligibleBillings}
      />
    </div>
  );
}
