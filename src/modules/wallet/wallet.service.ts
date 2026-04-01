import { BillingRecordStatus, LedgerStatus, PaymentProvider, PaymentTransactionStatus, Prisma, WalletLedgerType } from "@prisma/client";
import { db } from "@/lib/db";
import { createAuditLog } from "@/modules/audit/audit.service";

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
  actorUserId?: string;
}) {
  const payout = await db.$transaction(async (tx) => {
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

  if (args.actorUserId) {
    await createAuditLog({
      organizationId: args.organizationId,
      userId: args.actorUserId,
      action: "payout_request.created",
      entityType: "PayoutRequest",
      entityId: payout.id,
      metadata: {
        amount: args.amount.toString(),
        bankName: args.bankName,
        accountName: args.accountName,
      },
    });
  }

  return payout;
}

export async function processPayoutRequest(args: {
  payoutRequestId: string;
  status: "APPROVED" | "REJECTED" | "COMPLETED";
  adminUserId: string;
  adminNote?: string;
}) {
  const payout = await db.payoutRequest.findUniqueOrThrow({
    where: { id: args.payoutRequestId },
  });

  const updated = await db.$transaction(async (tx) => {
    const next = await tx.payoutRequest.update({
      where: { id: payout.id },
      data: {
        status: args.status,
        adminNote: args.adminNote,
        processedAt: new Date(),
        completedAt: args.status === "COMPLETED" ? new Date() : undefined,
      },
    });

    if (args.status === "APPROVED") {
      await tx.walletLedgerEntry.create({
        data: {
          organizationId: payout.organizationId,
          payoutRequestId: payout.id,
          type: WalletLedgerType.PAYOUT_APPROVED,
          amount: payout.amount,
          referenceId: payout.id,
          note: args.adminNote,
        },
      });
    }

    if (args.status === "REJECTED") {
      await tx.walletLedgerEntry.create({
        data: {
          organizationId: payout.organizationId,
          payoutRequestId: payout.id,
          type: WalletLedgerType.PAYOUT_REJECTED,
          amount: payout.amount,
          referenceId: payout.id,
          note: args.adminNote,
        },
      });
    }

    if (args.status === "COMPLETED") {
      await tx.walletLedgerEntry.create({
        data: {
          organizationId: payout.organizationId,
          payoutRequestId: payout.id,
          type: WalletLedgerType.PAYOUT_COMPLETED,
          amount: payout.amount,
          balanceDeltaAvailable: new Prisma.Decimal(payout.amount).negated(),
          referenceId: payout.id,
          note: args.adminNote,
        },
      });

      await tx.organizationWallet.update({
        where: { organizationId: payout.organizationId },
        data: {
          availableBalance: { decrement: payout.amount },
          totalWithdrawn: { increment: payout.amount },
        },
      });
    }

    return next;
  });

  await createAuditLog({
    organizationId: payout.organizationId,
    userId: args.adminUserId,
    action: `payout_request.${args.status.toLowerCase()}`,
    entityType: "PayoutRequest",
    entityId: payout.id,
    metadata: {
      adminNote: args.adminNote || null,
      amount: payout.amount.toString(),
    },
  });

  return updated;
}
