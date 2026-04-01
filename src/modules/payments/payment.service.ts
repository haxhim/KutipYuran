import { PaymentProvider, PaymentTransactionStatus, Prisma, WebhookStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getPaymentProvider } from "@/modules/payments/payment.factory";
import { markGatewayPaymentPaid, recordGatewayPaymentPending } from "@/modules/wallet/wallet.service";
import type { WebhookProcessResult } from "@/types";

export async function createBillingPaymentLink(args: {
  organizationId: string;
  billingRecordId: string;
  provider: PaymentProvider;
}) {
  const billingRecord = await db.billingRecord.findFirstOrThrow({
    where: { id: args.billingRecordId, organizationId: args.organizationId },
    include: { customer: true, organization: true },
  });

  const transaction = await db.paymentTransaction.create({
    data: {
      organizationId: args.organizationId,
      billingRecordId: args.billingRecordId,
      provider: args.provider,
      status: PaymentTransactionStatus.PENDING,
      amount: billingRecord.totalAmount,
    },
  });

  const adapter = getPaymentProvider(args.provider);
  const result = await adapter.createPaymentLink({
    organization: billingRecord.organization,
    billingRecord,
    transaction,
  });

  await db.paymentTransaction.update({
    where: { id: transaction.id },
    data: {
      providerReference: result.providerReference,
      checkoutUrl: result.checkoutUrl,
      rawResponse: result.rawResponse as object | undefined,
    },
  });

  await db.billingRecord.update({
    where: { id: args.billingRecordId },
    data: {
      paymentLinkUrl: result.checkoutUrl,
      gatewayCheckoutUrl: result.checkoutUrl,
      preferredProvider: args.provider,
    },
  });

  if (args.provider !== PaymentProvider.MANUAL) {
    await recordGatewayPaymentPending({
      organizationId: args.organizationId,
      paymentTransactionId: transaction.id,
      billingRecordId: args.billingRecordId,
      amount: new Prisma.Decimal(billingRecord.totalAmount),
      provider: args.provider,
    });
  }

  return result;
}

export async function processGatewayWebhook(args: {
  provider: PaymentProvider;
  headers: Headers;
  payload: unknown;
}) {
  const adapter = getPaymentProvider(args.provider);
  const result = (await adapter.handleWebhook({
    headers: args.headers,
    payload: args.payload,
  })) as WebhookProcessResult;

  const providerReference = result.providerReference;
  const existingEvent = providerReference
    ? await db.webhookEvent.findUnique({
        where: {
          provider_externalEventId: {
            provider: args.provider,
            externalEventId: providerReference,
          },
        },
      })
    : null;

  if (existingEvent?.status === WebhookStatus.PROCESSED || existingEvent?.status === WebhookStatus.DUPLICATE) {
    return {
      ok: true,
      duplicate: true,
      webhookEventId: existingEvent.id,
      transactionId: null,
    };
  }

  const transaction = providerReference
    ? await db.paymentTransaction.findFirst({
        where: { provider: args.provider, providerReference },
      })
    : null;

  const webhookEvent = existingEvent
    ? await db.webhookEvent.update({
        where: { id: existingEvent.id },
        data: {
          organizationId: transaction?.organizationId || existingEvent.organizationId,
          requestHeaders: Object.fromEntries(args.headers.entries()),
          payload: args.payload as object,
          signatureValid: result.signatureValid ?? result.success,
          status: WebhookStatus.VERIFIED,
          processingError: null,
        },
      })
    : await db.webhookEvent.create({
        data: {
          organizationId: transaction?.organizationId,
          provider: args.provider,
          externalEventId: providerReference,
          eventType: `${String(args.provider).toLowerCase()}.webhook`,
          requestHeaders: Object.fromEntries(args.headers.entries()),
          payload: args.payload as object,
          signatureValid: result.signatureValid ?? result.success,
          status: WebhookStatus.VERIFIED,
        },
      });

  if (!transaction) {
    await db.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: {
        status: WebhookStatus.FAILED,
        processingError: "Matching payment transaction not found",
      },
    });

    return {
      ok: false,
      duplicate: false,
      webhookEventId: webhookEvent.id,
      transactionId: null,
    };
  }

  if (result.status === "paid") {
    const paid = await markGatewayPaymentPaid({
      organizationId: transaction.organizationId,
      paymentTransactionId: transaction.id,
      billingRecordId: transaction.billingRecordId,
      amount: new Prisma.Decimal(transaction.amount),
      provider: args.provider,
    });

    await db.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: {
        status: paid.applied ? WebhookStatus.PROCESSED : WebhookStatus.DUPLICATE,
        processedAt: new Date(),
      },
    });

    return {
      ok: true,
      duplicate: !paid.applied,
      webhookEventId: webhookEvent.id,
      transactionId: transaction.id,
    };
  }

  await db.webhookEvent.update({
    where: { id: webhookEvent.id },
    data: {
      status: WebhookStatus.PROCESSED,
      processedAt: new Date(),
    },
  });

  return {
    ok: true,
    duplicate: false,
    webhookEventId: webhookEvent.id,
    transactionId: transaction.id,
  };
}

export async function reconcilePaymentTransaction(args: {
  organizationId: string;
  paymentTransactionId: string;
}) {
  const transaction = await db.paymentTransaction.findFirstOrThrow({
    where: {
      id: args.paymentTransactionId,
      organizationId: args.organizationId,
    },
  });

  const adapter = getPaymentProvider(transaction.provider);
  const result = await adapter.getTransactionStatus({ transaction });

  if (result.status === "paid") {
    return markGatewayPaymentPaid({
      organizationId: transaction.organizationId,
      paymentTransactionId: transaction.id,
      billingRecordId: transaction.billingRecordId,
      amount: new Prisma.Decimal(transaction.amount),
      provider: transaction.provider,
    });
  }

  return { applied: false };
}
