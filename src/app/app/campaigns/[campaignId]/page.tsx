import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { getCampaignDetail } from "@/modules/campaigns/campaign-read.service";
import { permissions } from "@/modules/authz/permissions";
import { requireTenantPermission } from "@/modules/tenant/tenant-context";
import { CampaignLiveView } from "@/app/app/campaigns/campaign-live-view";
import { RecipientFilterBar } from "@/app/app/campaigns/recipient-filter-bar";

export default async function CampaignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ campaignId: string }>;
  searchParams: Promise<{ status?: string; query?: string }>;
}) {
  const tenant = await requireTenantPermission(permissions.createCampaigns);
  const { campaignId } = await params;
  const filters = await searchParams;
  const campaign = await getCampaignDetail(tenant.organizationId, campaignId, filters);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{campaign.name}</h1>
        <p className="text-muted-foreground">Recipient-level delivery progress and latest message outcomes.</p>
      </div>

      <Card className="space-y-4">
        <div>
          <CardTitle>Live Progress</CardTitle>
          <CardDescription className="mt-2">
            Auto-refresh this page while the worker is sending messages to see recipient statuses move in near real time.
          </CardDescription>
        </div>
        <div className="grid gap-3 md:grid-cols-4 text-sm">
          <div className="rounded-xl bg-muted p-4">
            <p className="text-muted-foreground">Status</p>
            <p className="font-semibold">{campaign.status}</p>
          </div>
          <div className="rounded-xl bg-muted p-4">
            <p className="text-muted-foreground">Recipients</p>
            <p className="font-semibold">{campaign.totalRecipients}</p>
          </div>
          <div className="rounded-xl bg-muted p-4">
            <p className="text-muted-foreground">Sent</p>
            <p className="font-semibold">{campaign.sentCount}</p>
          </div>
          <div className="rounded-xl bg-muted p-4">
            <p className="text-muted-foreground">Failed</p>
            <p className="font-semibold">{campaign.failedCount}</p>
          </div>
        </div>
        <CampaignLiveView />
      </Card>

      <Card>
        <CardTitle>Recipient Delivery Table</CardTitle>
        <div className="mt-4">
          <RecipientFilterBar campaignId={campaign.id} />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-3">Recipient</th>
                <th>WhatsApp</th>
                <th>Billing</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Attempts</th>
                <th>Last Message</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {campaign.recipients.map((recipient) => (
                <tr key={recipient.id} className="border-b align-top">
                  <td className="py-3">{recipient.customer.fullName}</td>
                  <td>{recipient.customer.normalizedWhatsapp}</td>
                  <td>{recipient.billingRecord?.referenceNo || "-"}</td>
                  <td>{recipient.billingRecord ? formatCurrency(recipient.billingRecord.totalAmount.toString()) : "-"}</td>
                  <td>{recipient.status}</td>
                  <td>{recipient.attemptCount}</td>
                  <td className="max-w-sm whitespace-pre-wrap break-words text-xs">
                    {recipient.messageLogs[0]?.messageBody || "-"}
                  </td>
                  <td className="max-w-sm whitespace-pre-wrap break-words text-xs text-destructive">
                    {recipient.lastError || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
