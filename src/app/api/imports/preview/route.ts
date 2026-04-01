import { NextRequest, NextResponse } from "next/server";
import { permissions } from "@/modules/authz/permissions";
import { createImportPreviewJob, previewCsvImport } from "@/modules/imports/import.service";
import { assertCanImportCustomers } from "@/modules/saas/saas.service";
import { requireTenantPermission } from "@/modules/tenant/tenant-context";

export async function POST(request: NextRequest) {
  const tenant = await requireTenantPermission(permissions.manageCustomers);
  const body = await request.json();
  const preview = await previewCsvImport(tenant.organizationId, String(body.csvContent || ""));
  await assertCanImportCustomers(tenant.organizationId, preview.previewRows.length);
  const result = await createImportPreviewJob({
    organizationId: tenant.organizationId,
    csvContent: String(body.csvContent || ""),
    originalFileName: body.originalFileName ? String(body.originalFileName) : undefined,
    createdByUserId: tenant.user.id,
  });
  return NextResponse.json(result);
}
