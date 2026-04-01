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

