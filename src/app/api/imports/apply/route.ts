import { NextRequest, NextResponse } from "next/server";
import { permissions } from "@/modules/authz/permissions";
import { requireTenantPermission } from "@/modules/tenant/tenant-context";
import { createImportPreviewJob, enqueueImportJob } from "@/modules/imports/import.service";

export async function POST(request: NextRequest) {
  const tenant = await requireTenantPermission(permissions.manageCustomers);
  const body = await request.json();

  try {
    const importJobId = body.importJobId ? String(body.importJobId) : null;

    if (importJobId) {
      const job = await enqueueImportJob({
        organizationId: tenant.organizationId,
        importJobId,
      });
      return NextResponse.json({ ok: true, importJobId: job.id, status: job.status });
    }

    const preview = await createImportPreviewJob({
      organizationId: tenant.organizationId,
      csvContent: String(body.csvContent || ""),
      originalFileName: body.originalFileName ? String(body.originalFileName) : undefined,
      createdByUserId: tenant.user.id,
    });

    if (preview.preview.errors.length || preview.preview.duplicates.length) {
      return NextResponse.json(
        { error: "Import preview contains blocking validation issues", importJobId: preview.job.id },
        { status: 400 },
      );
    }

    await enqueueImportJob({
      organizationId: tenant.organizationId,
      importJobId: preview.job.id,
    });

    return NextResponse.json({ ok: true, importJobId: preview.job.id, status: "PROCESSING" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "CSV import failed" },
      { status: 400 },
    );
  }
}
