import { NextRequest, NextResponse } from "next/server";
import { permissions } from "@/modules/authz/permissions";
import { requireTenantPermission } from "@/modules/tenant/tenant-context";
import { createBillingReminderCampaign } from "@/modules/campaigns/campaign.service";

export async function POST(request: NextRequest) {
  const tenant = await requireTenantPermission(permissions.createCampaigns);
  const body = await request.json();
  const name = String(body.name || "").trim() || `Reminder Blast ${new Date().toLocaleDateString("en-CA")}`;
  const scheduledAt = body.scheduledAt ? new Date(String(body.scheduledAt)) : null;

  try {
    const campaign = await createBillingReminderCampaign({
      organizationId: tenant.organizationId,
      name,
      scheduledAt: scheduledAt && !Number.isNaN(scheduledAt.getTime()) ? scheduledAt : null,
    });
    return NextResponse.json(campaign);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create campaign" },
      { status: 400 },
    );
  }
}
