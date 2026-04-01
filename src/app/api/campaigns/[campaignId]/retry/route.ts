import { NextResponse } from "next/server";
import { permissions } from "@/modules/authz/permissions";
import { retryCampaignFailures } from "@/modules/campaigns/campaign.service";
import { requireTenantPermission } from "@/modules/tenant/tenant-context";

export async function POST(_: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const tenant = await requireTenantPermission(permissions.createCampaigns);
  const { campaignId } = await params;

  try {
    const campaign = await retryCampaignFailures(tenant.organizationId, campaignId);
    return NextResponse.json(campaign);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to retry failed recipients" },
      { status: 400 },
    );
  }
}
