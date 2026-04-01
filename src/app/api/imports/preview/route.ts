import { NextRequest, NextResponse } from "next/server";
import { permissions } from "@/modules/authz/permissions";
import { requireTenantPermission } from "@/modules/tenant/tenant-context";
import { createImportPreviewJob } from "@/modules/imports/import.service";

export async function POST(request: NextRequest) {
  const tenant = await requireTenantPermission(permissions.manageCustomers);
  const body = await request.json();
  const result = await createImportPreviewJob({
    organizationId: tenant.organizationId,
    csvContent: String(body.csvContent || ""),
    originalFileName: body.originalFileName ? String(body.originalFileName) : undefined,
    createdByUserId: tenant.user.id,
  });
  return NextResponse.json(result);
}
