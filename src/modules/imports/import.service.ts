import Papa from "papaparse";
import { db } from "@/lib/db";
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
    if (seen.has(row.normalizedWhatsapp)) {
      duplicates.add(row.normalizedWhatsapp);
    } else {
      seen.add(row.normalizedWhatsapp);
    }
  }

  return {
    previewRows,
    errors,
    duplicates: [...duplicates],
  };
}

export async function applyCsvImport(organizationId: string, csvContent: string) {
  const preview = await previewCsvImport(organizationId, csvContent);

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
