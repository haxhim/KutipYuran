import fs from "fs/promises";
import path from "path";
import Papa from "papaparse";
import { ImportJobStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { enqueueImportProcessing } from "@/queues";
import { normalizeMalaysiaPhone } from "@/lib/phone";

const planTokenRegex = /([^,]+?)\s*\{(\d+)\}/g;

export function parsePlanAssignments(raw: string) {
  const output: Array<{ planName: string; quantity: number }> = [];
  for (const match of raw.matchAll(planTokenRegex)) {
    output.push({
      planName: match[1].trim(),
      quantity: Number(match[2]),
    });
  }
  return output;
}

export async function previewCsvImport(organizationId: string, csvContent: string) {
  const parsed = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  const feePlans = await db.feePlan.findMany({
    where: { organizationId, deletedAt: null },
  });

  const errors: Array<{ rowNumber: number; message: string }> = [];
  const previewRows = parsed.data.map((row, index) => {
    const normalizedWhatsapp = normalizeMalaysiaPhone(row.WaNumber || "");
    const assignments = parsePlanAssignments(row["Plans & Quantity"] || "");

    if (!row.Name || !row.WaNumber || !row["Plans & Quantity"]) {
      errors.push({ rowNumber: index + 2, message: "Missing required columns" });
    }

    const missingPlans = assignments
      .filter((assignment) => !feePlans.some((plan) => plan.name === assignment.planName))
      .map((assignment) => assignment.planName);

    if (missingPlans.length) {
      errors.push({ rowNumber: index + 2, message: `Unknown plans: ${missingPlans.join(", ")}` });
    }

    return {
      rowNumber: index + 2,
      name: row.Name,
      waNumber: row.WaNumber,
      normalizedWhatsapp,
      assignments,
    };
  });

  const duplicates = new Set<string>();
  const seen = new Set<string>();

  for (const row of previewRows) {
    if (row.normalizedWhatsapp && seen.has(row.normalizedWhatsapp)) {
      duplicates.add(row.normalizedWhatsapp);
    } else if (row.normalizedWhatsapp) {
      seen.add(row.normalizedWhatsapp);
    }
  }

  return {
    previewRows,
    errors,
    duplicates: [...duplicates],
  };
}

async function ensureImportDir(organizationId: string) {
  const dir = path.join(env.UPLOAD_ROOT, "imports", organizationId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

async function persistImportFile(organizationId: string, fileName: string, csvContent: string) {
  const dir = await ensureImportDir(organizationId);
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = path.join(dir, `${Date.now()}-${safeName || "import.csv"}`);
  await fs.writeFile(filePath, csvContent, "utf8");
  return filePath;
}

export async function createImportPreviewJob(args: {
  organizationId: string;
  csvContent: string;
  originalFileName?: string;
  createdByUserId?: string;
}) {
  const preview = await previewCsvImport(args.organizationId, args.csvContent);
  const filePath = await persistImportFile(args.organizationId, args.originalFileName || "customers-import.csv", args.csvContent);

  const job = await db.importJob.create({
    data: {
      organizationId: args.organizationId,
      filePath,
      originalFileName: args.originalFileName || "customers-import.csv",
      status: ImportJobStatus.DRAFT,
      totalRows: preview.previewRows.length,
      successRows: 0,
      failedRows: preview.errors.length,
      createdByUserId: args.createdByUserId,
      previewData: preview,
    },
  });

  if (preview.errors.length) {
    await db.importRowError.createMany({
      data: preview.errors.map((error) => ({
        organizationId: args.organizationId,
        importJobId: job.id,
        rowNumber: error.rowNumber,
        message: error.message,
      })),
    });
  }

  return { job, preview };
}

async function applyPreviewRows(organizationId: string, preview: Awaited<ReturnType<typeof previewCsvImport>>) {
  if (preview.errors.length) {
    throw new Error(preview.errors[0]?.message || "CSV import validation failed");
  }

  if (preview.duplicates.length) {
    throw new Error(`Duplicate WhatsApp numbers found in CSV: ${preview.duplicates.join(", ")}`);
  }

  const feePlans = await db.feePlan.findMany({
    where: { organizationId, deletedAt: null },
    select: { id: true, name: true },
  });
  const planMap = new Map(feePlans.map((plan) => [plan.name, plan.id]));

  let createdCustomers = 0;
  let updatedCustomers = 0;
  let assignmentsUpserted = 0;

  await db.$transaction(async (tx) => {
    for (const row of preview.previewRows) {
      if (!row.name || !row.normalizedWhatsapp) {
        throw new Error(`Row ${row.rowNumber} is missing a valid name or WhatsApp number`);
      }

      const existing = await tx.customer.findUnique({
        where: {
          organizationId_normalizedWhatsapp: {
            organizationId,
            normalizedWhatsapp: row.normalizedWhatsapp,
          },
        },
      });

      const customer = existing
        ? await tx.customer.update({
            where: { id: existing.id },
            data: {
              fullName: row.name,
              phoneNumber: row.waNumber,
              normalizedWhatsapp: row.normalizedWhatsapp,
              deletedAt: null,
            },
          })
        : await tx.customer.create({
            data: {
              organizationId,
              fullName: row.name,
              firstName: row.name.split(" ")[0] || row.name,
              phoneNumber: row.waNumber,
              normalizedWhatsapp: row.normalizedWhatsapp,
            },
          });

      if (existing) {
        updatedCustomers += 1;
      } else {
        createdCustomers += 1;
      }

      for (const assignment of row.assignments) {
        const feePlanId = planMap.get(assignment.planName);
        if (!feePlanId) {
          throw new Error(`Plan not found during import: ${assignment.planName}`);
        }

        await tx.customerPlanAssignment.upsert({
          where: {
            customerId_feePlanId: {
              customerId: customer.id,
              feePlanId,
            },
          },
          update: {
            organizationId,
            quantity: assignment.quantity,
            active: true,
            endDate: null,
          },
          create: {
            organizationId,
            customerId: customer.id,
            feePlanId,
            quantity: assignment.quantity,
            active: true,
          },
        });

        assignmentsUpserted += 1;
      }
    }
  });

  return {
    processedRows: preview.previewRows.length,
    createdCustomers,
    updatedCustomers,
    assignmentsUpserted,
  };
}

export async function applyCsvImport(organizationId: string, csvContent: string) {
  const preview = await previewCsvImport(organizationId, csvContent);
  return applyPreviewRows(organizationId, preview);
}

export async function listImportJobs(organizationId: string) {
  return db.importJob.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    include: {
      rowErrors: {
        orderBy: { rowNumber: "asc" },
        take: 10,
      },
    },
  });
}

export async function enqueueImportJob(args: { organizationId: string; importJobId: string }) {
  const job = await db.importJob.findFirstOrThrow({
    where: {
      id: args.importJobId,
      organizationId: args.organizationId,
    },
  });

  await db.importJob.update({
    where: { id: job.id },
    data: {
      status: ImportJobStatus.PROCESSING,
      successRows: 0,
      failedRows: 0,
    },
  });

  await enqueueImportProcessing({ importJobId: job.id });
  return job;
}

export async function processImportJob(importJobId: string) {
  const job = await db.importJob.findUniqueOrThrow({
    where: { id: importJobId },
  });

  const csvContent = await fs.readFile(job.filePath, "utf8");
  const preview = await previewCsvImport(job.organizationId, csvContent);

  await db.importRowError.deleteMany({
    where: { importJobId: job.id },
  });

  if (preview.errors.length) {
    await db.importRowError.createMany({
      data: preview.errors.map((error) => ({
        organizationId: job.organizationId,
        importJobId: job.id,
        rowNumber: error.rowNumber,
        message: error.message,
      })),
    });

    await db.importJob.update({
      where: { id: job.id },
      data: {
        status: ImportJobStatus.FAILED,
        totalRows: preview.previewRows.length,
        successRows: 0,
        failedRows: preview.errors.length,
        previewData: preview,
      },
    });

    throw new Error(preview.errors[0]?.message || "Import validation failed");
  }

  try {
    const result = await applyPreviewRows(job.organizationId, preview);
    await db.importJob.update({
      where: { id: job.id },
      data: {
        status: ImportJobStatus.COMPLETED,
        totalRows: result.processedRows,
        successRows: result.processedRows,
        failedRows: 0,
        previewData: preview,
      },
    });

    return result;
  } catch (error) {
    await db.importJob.update({
      where: { id: job.id },
      data: {
        status: ImportJobStatus.FAILED,
        totalRows: preview.previewRows.length,
        successRows: 0,
        failedRows: preview.previewRows.length,
        previewData: preview,
      },
    });
    throw error;
  }
}
