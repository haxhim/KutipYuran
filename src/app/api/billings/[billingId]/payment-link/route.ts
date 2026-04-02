import { NextRequest, NextResponse } from "next/server";
import { PaymentProvider } from "@prisma/client";
import { permissions } from "@/modules/authz/permissions";
import { requireTenantPermission } from "@/modules/tenant/tenant-context";
import { createBillingPaymentLink } from "@/modules/payments/payment.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ billingId: string }> }) {
  const tenant = await requireTenantPermission(permissions.manageBilling);
  const { billingId } = await params;
  try {
    const body = await request.json();
    const provider = (body.provider || "MANUAL") as PaymentProvider;
    const result = await createBillingPaymentLink({
      organizationId: tenant.organizationId,
      billingRecordId: billingId,
      provider,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create payment link" },
      { status: 400 },
    );
  }
}
