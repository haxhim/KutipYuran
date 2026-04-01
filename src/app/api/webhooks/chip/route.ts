import { NextRequest, NextResponse } from "next/server";
import { PaymentProvider } from "@prisma/client";
import { processGatewayWebhook } from "@/modules/payments/payment.service";

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const result = await processGatewayWebhook({
    provider: PaymentProvider.CHIP,
    headers: request.headers,
    payload,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
