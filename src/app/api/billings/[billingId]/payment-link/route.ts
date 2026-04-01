import { NextRequest, NextResponse } from "next/server";
import { PaymentProvider } from "@prisma/client";
import { requireTenantContext } from "@/modules/tenant/tenant-context";
import { createBillingPaymentLink } from "@/modules/payments/payment.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ billingId: string }> }) {
  const tenant = await requireTenantContext();
  const { billingId } = await params;
  const body = await request.json();
  const provider = (body.provider || "MANUAL") as PaymentProvider;
  const result = await createBillingPaymentLink({
    organizationId: tenant.organizationId,
    billingRecordId: billingId,
    provider,
  });
  return NextResponse.json(result);
}

