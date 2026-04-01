import { PaymentProvider, PaymentTransactionStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getPaymentProvider } from "@/modules/payments/payment.factory";
import { recordGatewayPaymentPending } from "@/modules/wallet/wallet.service";

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

