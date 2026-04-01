import fs from "fs/promises";
import path from "path";
import { PaymentProvider, PaymentTransactionStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { createAuditLog } from "@/modules/audit/audit.service";

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf",
]);

const maxProofSizeBytes = 5 * 1024 * 1024;

async function ensureProofDir(organizationId: string) {
  const dir = path.join(env.UPLOAD_ROOT, "manual-proofs", organizationId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function assertSafeProofPath(filePath: string) {
  const uploadRoot = path.resolve(env.UPLOAD_ROOT);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(uploadRoot)) {
    throw new Error("Unsafe proof path");
  }
  return resolved;
}

async function getOrCreateManualTransaction(organizationId: string, billingRecordId: string) {
  const existing = await db.paymentTransaction.findFirst({
    where: {
      organizationId,
      billingRecordId,
      provider: PaymentProvider.MANUAL,
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    return existing;
  }

  const billing = await db.billingRecord.findFirstOrThrow({
    where: {
      id: billingRecordId,
      organizationId,
    },
  });

  return db.paymentTransaction.create({
    data: {
      organizationId,
      billingRecordId,
      provider: PaymentProvider.MANUAL,
      status: PaymentTransactionStatus.PENDING,
      amount: billing.totalAmount,
      checkoutUrl: `${env.APP_URL}/pay/manual/${billingRecordId}`,
      providerReference: `manual-${billing.referenceNo}`,
    },
  });
}

export async function uploadManualPaymentProof(args: {
  billingRecordId: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  bytes: Uint8Array;
}) {
  if (!allowedMimeTypes.has(args.mimeType)) {
    throw new Error("Only JPG, PNG, or PDF proof files are allowed");
  }

  if (args.fileSize <= 0 || args.fileSize > maxProofSizeBytes) {
    throw new Error("Proof file must be between 1 byte and 5 MB");
  }

  const billing = await db.billingRecord.findUniqueOrThrow({
    where: { id: args.billingRecordId },
    include: {
      customer: true,
      organization: true,
    },
  });

  const transaction = await getOrCreateManualTransaction(billing.organizationId, billing.id);
  const dir = await ensureProofDir(billing.organizationId);
  const safeName = sanitizeFileName(args.originalFileName || "proof");
  const filePath = path.join(dir, `${Date.now()}-${safeName}`);
  await fs.writeFile(filePath, Buffer.from(args.bytes));

  const proof = await db.manualPaymentProof.create({
    data: {
      organizationId: billing.organizationId,
      customerId: billing.customerId,
      billingRecordId: billing.id,
      paymentTransactionId: transaction.id,
      filePath,
      originalFileName: args.originalFileName,
      mimeType: args.mimeType,
      fileSize: args.fileSize,
    },
  });

  await createAuditLog({
    organizationId: billing.organizationId,
    action: "manual_payment_proof.uploaded",
    entityType: "ManualPaymentProof",
    entityId: proof.id,
    metadata: {
      billingRecordId: billing.id,
      paymentTransactionId: transaction.id,
      originalFileName: args.originalFileName,
    },
  });

  return { proof, transactionId: transaction.id, organizationName: billing.organization.name, referenceNo: billing.referenceNo };
}

export async function getManualPaymentProofForDownload(args: {
  organizationId: string;
  proofId: string;
}) {
  const proof = await db.manualPaymentProof.findFirstOrThrow({
    where: {
      id: args.proofId,
      organizationId: args.organizationId,
    },
  });

  const resolvedPath = assertSafeProofPath(proof.filePath);
  const bytes = await fs.readFile(resolvedPath);

  return {
    proof,
    bytes,
  };
}
