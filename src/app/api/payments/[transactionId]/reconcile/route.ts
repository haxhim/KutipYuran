import { NextResponse } from "next/server";
import { permissions } from "@/modules/authz/permissions";
import { reconcileTransactionForTenant } from "@/modules/payments/payment-ops.service";
import { requireTenantPermission } from "@/modules/tenant/tenant-context";

export async function POST(_: Request, { params }: { params: Promise<{ transactionId: string }> }) {
  const tenant = await requireTenantPermission(permissions.manageBilling);
  const { transactionId } = await params;

  try {
    const detail = await reconcileTransactionForTenant({
      organizationId: tenant.organizationId,
      transactionId,
      actorUserId: tenant.user.id,
    });
    return NextResponse.json({ ok: true, status: detail.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reconcile transaction" },
      { status: 400 },
    );
  }
}
