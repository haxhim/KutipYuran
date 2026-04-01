import { NextRequest, NextResponse } from "next/server";
import { permissions } from "@/modules/authz/permissions";
import { verifyManualPaymentProof } from "@/modules/payments/payment-ops.service";
import { requireTenantPermission } from "@/modules/tenant/tenant-context";

export async function POST(request: NextRequest, { params }: { params: Promise<{ proofId: string }> }) {
  const tenant = await requireTenantPermission(permissions.verifyManualPayments);
  const { proofId } = await params;
  const body = await request.json().catch(() => ({}));

  try {
    const detail = await verifyManualPaymentProof({
      organizationId: tenant.organizationId,
      proofId,
      verifierUserId: tenant.user.id,
      note: body.note ? String(body.note) : undefined,
    });
    return NextResponse.json({ ok: true, transactionId: detail.id, status: detail.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to verify manual payment proof" },
      { status: 400 },
    );
  }
}
