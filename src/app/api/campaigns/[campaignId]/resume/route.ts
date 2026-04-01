import { NextResponse } from "next/server";
import { permissions } from "@/modules/authz/permissions";
import { requireTenantPermission } from "@/modules/tenant/tenant-context";
import { resumeCampaign } from "@/modules/campaigns/campaign.service";

export async function POST(_: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const tenant = await requireTenantPermission(permissions.createCampaigns);
  const { campaignId } = await params;

  try {
    const campaign = await resumeCampaign(tenant.organizationId, campaignId);
    return NextResponse.json(campaign);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to resume campaign" },
      { status: 400 },
    );
  }
}
