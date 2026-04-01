import { NextRequest, NextResponse } from "next/server";
import { permissions } from "@/modules/authz/permissions";
import { exportCampaignRecipientsCsv } from "@/modules/campaigns/campaign-read.service";
import { requireTenantPermission } from "@/modules/tenant/tenant-context";

export async function GET(request: NextRequest, { params }: { params: Promise<{ campaignId: string }> }) {
  const tenant = await requireTenantPermission(permissions.createCampaigns);
  const { campaignId } = await params;
  const status = request.nextUrl.searchParams.get("status") || undefined;
  const query = request.nextUrl.searchParams.get("query") || undefined;

  const csv = await exportCampaignRecipientsCsv(tenant.organizationId, campaignId, {
    status,
    query,
  });

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="campaign-${campaignId}-recipients.csv"`,
    },
  });
}
