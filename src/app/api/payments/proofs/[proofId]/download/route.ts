import { NextResponse } from "next/server";
import { permissions } from "@/modules/authz/permissions";
import { getManualPaymentProofForDownload } from "@/modules/payments/manual-proof.service";
import { requireTenantPermission } from "@/modules/tenant/tenant-context";

export async function GET(_: Request, { params }: { params: Promise<{ proofId: string }> }) {
  const tenant = await requireTenantPermission(permissions.manageBilling);
  const { proofId } = await params;

  try {
    const result = await getManualPaymentProofForDownload({
      organizationId: tenant.organizationId,
      proofId,
    });

    return new NextResponse(result.bytes, {
      status: 200,
      headers: {
        "Content-Type": result.proof.mimeType,
        "Content-Disposition": `attachment; filename="${result.proof.originalFileName}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to download proof" },
      { status: 400 },
    );
  }
}
