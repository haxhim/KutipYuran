import { Card, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { requireTenantContext } from "@/modules/tenant/tenant-context";

export default async function CampaignsPage() {
  const tenant = await requireTenantContext();
  const campaigns = await db.reminderCampaign.findMany({
    where: { organizationId: tenant.organizationId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Campaigns</h1>
      <Card>
        <CardTitle>Reminder campaigns</CardTitle>
        <div className="mt-4 space-y-3">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="rounded-xl bg-muted p-4 text-sm">
              <p className="font-medium">{campaign.name}</p>
              <p>Status: {campaign.status}</p>
              <p>Recipients: {campaign.totalRecipients}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

