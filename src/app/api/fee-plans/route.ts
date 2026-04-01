import { NextRequest, NextResponse } from "next/server";
import { permissions } from "@/modules/authz/permissions";
import { listFeePlans, upsertFeePlan } from "@/modules/fee-plans/fee-plan.service";
import { requireTenantPermission } from "@/modules/tenant/tenant-context";

export async function GET() {
  const tenant = await requireTenantPermission(permissions.manageBilling);
  const plans = await listFeePlans(tenant.organizationId);
  return NextResponse.json(plans);
}

export async function POST(request: NextRequest) {
  const tenant = await requireTenantPermission(permissions.manageBilling);
  const body = await request.json();

  try {
    const plan = await upsertFeePlan({
      organizationId: tenant.organizationId,
      actorUserId: tenant.user.id,
      payload: body,
    });
    return NextResponse.json(plan);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save fee plan" },
      { status: 400 },
    );
  }
}
