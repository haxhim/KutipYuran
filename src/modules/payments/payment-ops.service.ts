import { BillingRecordStatus, PaymentTransactionStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { createAuditLog } from "@/modules/audit/audit.service";
import { reconcilePaymentTransaction } from "@/modules/payments/payment.service";

export async function listPaymentTransactions(
  organizationId: string,
  filters?: {
    provider?: string;
    status?: string;
    query?: string;
  },
) {
  return db.paymentTransaction.findMany({
    where: {
      organizationId,
      provider: filters?.provider && filters.provider !== "ALL" ? filters.provider as never : undefined,
      status: filters?.status && filters.status !== "ALL" ? filters.status as never : undefined,
      OR: filters?.query
        ? [
            { providerReference: { contains: filters.query, mode: "insensitive" } },
            { billingRecord: { referenceNo: { contains: filters.query, mode: "insensitive" } } },
            { billingRecord: { customer: { fullName: { contains: filters.query, mode: "insensitive" } } } },
          ]
        : undefined,
    },
    orderBy: { createdAt: "desc" },
    include: {
      billingRecord: {
        include: {
          customer: true,
        },
      },
      manualPaymentProofs: true,
    },
  });
}

export async function exportPaymentTransactionsCsv(
  organizationId: string,
  filters?: {
    provider?: string;
    status?: string;
    query?: string;
  },
) {
  const transactions = await listPaymentTransactions(organizationId, filters);
  const rows = [
    ["Provider", "Status", "Amount", "Currency", "Reference", "Customer", "Created At"],
    ...transactions.map((transaction) => [
      transaction.provider,
      transaction.status,
      transaction.amount.toString(),
      transaction.currency,
      transaction.providerReference || transaction.billingRecord.referenceNo,
      transaction.billingRecord.customer.fullName,
      transaction.createdAt.toISOString(),
    ]),
  ];

  return rows
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

export async function getPaymentTransactionDetail(organizationId: string, transactionId: string) {
  return db.paymentTransaction.findFirstOrThrow({
    where: {
      id: transactionId,
      organizationId,
    },
    include: {
      organization: true,
      billingRecord: {
        include: {
          customer: true,
          items: true,
          proofs: true,
        },
      },
      manualPaymentProofs: {
        orderBy: { uploadedAt: "desc" },
      },
      ledgerEntries: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function verifyManualPaymentProof(args: {
  organizationId: string;
  proofId: string;
  verifierUserId: string;
  note?: string;
}) {
  const proof = await db.manualPaymentProof.findFirstOrThrow({
    where: {
      id: args.proofId,
      organizationId: args.organizationId,
    },
    include: {
      billingRecord: true,
      paymentTransaction: true,
    },
  });

  if (!proof.paymentTransactionId) {
    throw new Error("Manual proof is not linked to a payment transaction");
  }

  if (proof.paymentTransaction?.provider !== "MANUAL") {
    throw new Error("Only manual payment proofs can be verified here");
  }

  await db.$transaction(async (tx) => {
    await tx.manualPaymentProof.update({
      where: { id: proof.id },
      data: {
        verifiedAt: new Date(),
        verifiedByUserId: args.verifierUserId,
        note: args.note || proof.note,
      },
    });

    await tx.paymentTransaction.update({
      where: { id: proof.paymentTransactionId! },
      data: {
        status: PaymentTransactionStatus.PAID,
        paidAt: new Date(),
      },
    });

    await tx.billingRecord.update({
      where: { id: proof.billingRecordId },
      data: {
        status: BillingRecordStatus.PAID,
        amountPaid: new Prisma.Decimal(proof.billingRecord.totalAmount),
        paidAt: new Date(),
      },
    });
  });

  await createAuditLog({
    organizationId: args.organizationId,
    userId: args.verifierUserId,
    action: "manual_payment_proof.verified",
    entityType: "ManualPaymentProof",
    entityId: proof.id,
    metadata: {
      paymentTransactionId: proof.paymentTransactionId,
      billingRecordId: proof.billingRecordId,
      note: args.note || null,
    },
  });

  return getPaymentTransactionDetail(args.organizationId, proof.paymentTransactionId);
}

export async function rejectManualPaymentProof(args: {
  organizationId: string;
  proofId: string;
  actorUserId: string;
  note?: string;
}) {
  const proof = await db.manualPaymentProof.findFirstOrThrow({
    where: {
      id: args.proofId,
      organizationId: args.organizationId,
    },
    include: {
      paymentTransaction: true,
    },
  });

  if (!proof.paymentTransactionId) {
    throw new Error("Manual proof is not linked to a payment transaction");
  }

  await db.$transaction(async (tx) => {
    await tx.manualPaymentProof.update({
      where: { id: proof.id },
      data: {
        verifiedAt: null,
        verifiedByUserId: args.actorUserId,
        note: args.note ? `Rejected: ${args.note}` : "Rejected by reviewer",
      },
    });

    await tx.paymentTransaction.update({
      where: { id: proof.paymentTransactionId! },
      data: {
        status: PaymentTransactionStatus.FAILED,
      },
    });
  });

  await createAuditLog({
    organizationId: args.organizationId,
    userId: args.actorUserId,
    action: "manual_payment_proof.rejected",
    entityType: "ManualPaymentProof",
    entityId: proof.id,
    metadata: {
      paymentTransactionId: proof.paymentTransactionId,
      note: args.note || null,
    },
  });

  return getPaymentTransactionDetail(args.organizationId, proof.paymentTransactionId);
}

export async function reconcileTransactionForTenant(args: {
  organizationId: string;
  transactionId: string;
  actorUserId: string;
}) {
  const result = await reconcilePaymentTransaction({
    organizationId: args.organizationId,
    paymentTransactionId: args.transactionId,
  });

  await createAuditLog({
    organizationId: args.organizationId,
    userId: args.actorUserId,
    action: "payment_transaction.reconciled",
    entityType: "PaymentTransaction",
    entityId: args.transactionId,
    metadata: result,
  });

  return getPaymentTransactionDetail(args.organizationId, args.transactionId);
}
