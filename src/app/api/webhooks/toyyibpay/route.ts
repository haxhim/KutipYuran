import { NextRequest, NextResponse } from "next/server";
import { PaymentProvider, Prisma, WebhookStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getPaymentProvider } from "@/modules/payments/payment.factory";
import { markGatewayPaymentPaid } from "@/modules/wallet/wallet.service";

export async function POST(request: NextRequest) {
  const payload = Object.fromEntries(new URLSearchParams(await request.text()).entries());
  const adapter = getPaymentProvider(PaymentProvider.TOYYIBPAY);
  const result = await adapter.handleWebhook({
    headers: request.headers,
    payload,
  });
  const providerReference = result.providerReference;

  const transaction = await db.paymentTransaction.findFirst({
    where: { provider: PaymentProvider.TOYYIBPAY, providerReference: providerReference || undefined },
  });

  await db.webhookEvent.create({
    data: {
      organizationId: transaction?.organizationId,
      provider: PaymentProvider.TOYYIBPAY,
      externalEventId: providerReference,
      eventType: "toyyibpay.webhook",
      requestHeaders: Object.fromEntries(request.headers.entries()),
      payload,
      signatureValid: true,
      status: WebhookStatus.PROCESSED,
    },
  }).catch(() => null);

  if (transaction && result.status === "paid") {
    await markGatewayPaymentPaid({
      organizationId: transaction.organizationId,
      paymentTransactionId: transaction.id,
      billingRecordId: transaction.billingRecordId,
      amount: new Prisma.Decimal(transaction.amount),
      provider: PaymentProvider.TOYYIBPAY,
    });
  }

  return NextResponse.json({ ok: true });
}
