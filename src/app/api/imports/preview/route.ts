import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext } from "@/modules/tenant/tenant-context";
import { previewCsvImport } from "@/modules/imports/import.service";

export async function POST(request: NextRequest) {
  const tenant = await requireTenantContext();
  const body = await request.json();
  const preview = await previewCsvImport(tenant.organizationId, body.csvContent);
  return NextResponse.json(preview);
}

