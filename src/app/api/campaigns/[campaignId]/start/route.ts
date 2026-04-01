import { NextResponse } from "next/server";
import { requireTenantContext } from "@/modules/tenant/tenant-context";
import { startCampaign } from "@/modules/campaigns/campaign.service";

export async function POST(_: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const tenant = await requireTenantContext();
  const { campaignId } = await params;
  const campaign = await startCampaign(tenant.organizationId, campaignId);
  return NextResponse.json(campaign);
}

