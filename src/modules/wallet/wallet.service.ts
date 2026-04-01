import { BillingRecordStatus, LedgerStatus, PaymentProvider, PaymentTransactionStatus, Prisma, WalletLedgerType } from "@prisma/client";
import { db } from "@/lib/db";

export async function recordGatewayPaymentPending(args: {
  organizationId: string;
  paymentTransactionId: string;
  billingRecordId: string;
  amount: Prisma.Decimal;
  provider: PaymentProvider;
}) {
  return db.$transaction(async (tx) => {
    await tx.walletLedgerEntry.create({
      data: {
        organizationId: args.organizationId,
        paymentTransactionId: args.paymentTransactionId,
        type: WalletLedgerType.PAYMENT_PENDING,
        status: LedgerStatus.POSTED,
        amount: args.amount,
        balanceDeltaPending: args.amount,
        referenceId: args.billingRecordId,
        externalProvider: args.provider,
      },
    });

    await tx.organizationWallet.update({
      where: { organizationId: args.organizationId },
      data: {
        pendingBalance: { increment: args.amount },
      },
    });
  });
}

export async function markGatewayPaymentPaid(args: {
  organizationId: string;
  paymentTransactionId: string;
  billingRecordId: string;
  amount: Prisma.Decimal;
  provider: PaymentProvider;
}) {
  return db.$transaction(async (tx) => {
    const transaction = await tx.paymentTransaction.findUniqueOrThrow({
      where: { id: args.paymentTransactionId },
      include: {
        ledgerEntries: true,
      },
    });

    const alreadyReceived = transaction.ledgerEntries.some((entry) => entry.type === WalletLedgerType.PAYMENT_RECEIVED);
    if (alreadyReceived || transaction.status === PaymentTransactionStatus.PAID) {
      return { applied: false };
    }

    const hasPendingLedger = transaction.ledgerEntries.some((entry) => entry.type === WalletLedgerType.PAYMENT_PENDING);

    await tx.paymentTransaction.update({
      where: { id: args.paymentTransactionId },
      data: {
        status: PaymentTransactionStatus.PAID,
        paidAt: new Date(),
      },
    });

    await tx.billingRecord.update({
      where: { id: args.billingRecordId },
      data: {
        status: BillingRecordStatus.PAID,
        amountPaid: args.amount,
        paidAt: new Date(),
      },
    });

    await tx.walletLedgerEntry.create({
      data: {
        organizationId: args.organizationId,
        paymentTransactionId: args.paymentTransactionId,
        type: WalletLedgerType.PAYMENT_RECEIVED,
        amount: args.amount,
        balanceDeltaAvailable: args.amount,
        balanceDeltaPending: hasPendingLedger ? new Prisma.Decimal(args.amount).negated() : new Prisma.Decimal(0),
        referenceId: args.billingRecordId,
        externalProvider: args.provider,
      },
    });

    await tx.organizationWallet.update({
      where: { organizationId: args.organizationId },
      data: {
        availableBalance: { increment: args.amount },
        pendingBalance: hasPendingLedger ? { decrement: args.amount } : undefined,
        totalEarned: { increment: args.amount },
      },
    });

    return { applied: true };
  });
}

export async function createPayoutRequest(args: {
  organizationId: string;
  amount: Prisma.Decimal;
  bankName: string;
  accountName: string;
  accountNumber: string;
}) {
  return db.$transaction(async (tx) => {
    const wallet = await tx.organizationWallet.findUniqueOrThrow({
      where: { organizationId: args.organizationId },
    });

    if (wallet.availableBalance.lt(args.amount)) {
      throw new Error("Insufficient available balance");
    }

    const payout = await tx.payoutRequest.create({
      data: {
        organizationId: args.organizationId,
        amount: args.amount,
        bankName: args.bankName,
        accountName: args.accountName,
        accountNumber: args.accountNumber,
      },
    });

    await tx.walletLedgerEntry.create({
      data: {
        organizationId: args.organizationId,
        payoutRequestId: payout.id,
        type: WalletLedgerType.PAYOUT_REQUESTED,
        amount: args.amount,
        referenceId: payout.id,
      },
    });

    return payout;
  });
}
