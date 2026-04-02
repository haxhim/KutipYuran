import { NextRequest, NextResponse } from "next/server";
import { PaymentProvider } from "@prisma/client";
import { processGatewayWebhook } from "@/modules/payments/payment.service";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const payload = rawBody ? JSON.parse(rawBody) : null;
  const result = await processGatewayWebhook({
    provider: PaymentProvider.CHIP,
    headers: request.headers,
    payload: {
      rawBody,
      parsed: payload,
    },
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
