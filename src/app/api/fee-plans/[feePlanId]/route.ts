import { NextRequest, NextResponse } from "next/server";
import { permissions } from "@/modules/authz/permissions";
import { deactivateFeePlan, upsertFeePlan } from "@/modules/fee-plans/fee-plan.service";
import { requireTenantPermission } from "@/modules/tenant/tenant-context";

export async function POST(request: NextRequest, { params }: { params: Promise<{ feePlanId: string }> }) {
  const tenant = await requireTenantPermission(permissions.manageBilling);
  const { feePlanId } = await params;
  const body = await request.json();

  try {
    const plan = await upsertFeePlan({
      organizationId: tenant.organizationId,
      actorUserId: tenant.user.id,
      feePlanId,
      payload: body,
    });
    return NextResponse.json(plan);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update fee plan" },
      { status: 400 },
    );
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ feePlanId: string }> }) {
  const tenant = await requireTenantPermission(permissions.manageBilling);
  const { feePlanId } = await params;

  try {
    const plan = await deactivateFeePlan({
      organizationId: tenant.organizationId,
      actorUserId: tenant.user.id,
      feePlanId,
    });
    return NextResponse.json(plan);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to deactivate fee plan" },
      { status: 400 },
    );
  }
}
