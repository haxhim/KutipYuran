import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext } from "@/modules/tenant/tenant-context";
import { applyCsvImport } from "@/modules/imports/import.service";

export async function POST(request: NextRequest) {
  const tenant = await requireTenantContext();
  const body = await request.json();

  try {
    const result = await applyCsvImport(tenant.organizationId, String(body.csvContent || ""));
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "CSV import failed" },
      { status: 400 },
    );
  }
}
