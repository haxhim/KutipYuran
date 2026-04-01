import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext } from "@/modules/tenant/tenant-context";
import { createBillingReminderCampaign } from "@/modules/campaigns/campaign.service";

export async function POST(request: NextRequest) {
  const tenant = await requireTenantContext();
  const body = await request.json();
  const name = String(body.name || "").trim() || `Reminder Blast ${new Date().toLocaleDateString("en-CA")}`;

  try {
    const campaign = await createBillingReminderCampaign(tenant.organizationId, name);
    return NextResponse.json(campaign);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create campaign" },
      { status: 400 },
    );
  }
}
