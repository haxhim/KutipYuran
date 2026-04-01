import { NextRequest, NextResponse } from "next/server";
import { permissions } from "@/modules/authz/permissions";
import { requireTenantPermission } from "@/modules/tenant/tenant-context";
import { previewCsvImport } from "@/modules/imports/import.service";

export async function POST(request: NextRequest) {
  const tenant = await requireTenantPermission(permissions.manageCustomers);
  const body = await request.json();
  const preview = await previewCsvImport(tenant.organizationId, body.csvContent);
  return NextResponse.json(preview);
}
