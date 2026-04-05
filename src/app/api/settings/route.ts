import { NextRequest, NextResponse } from "next/server";
import { permissions } from "@/modules/authz/permissions";
import { updateWorkspaceProfile } from "@/modules/settings/settings.service";
import { requireTenantPermission } from "@/modules/tenant/tenant-context";

export async function POST(request: NextRequest) {
  const tenant = await requireTenantPermission(permissions.manageOrganizationSettings);
  const body = await request.json();

  try {
    const result = await updateWorkspaceProfile({
      organizationId: tenant.organizationId,
      actorUserId: tenant.user.id,
      companyName: String(body.companyName || body.name || "").trim(),
      contactPerson: String(body.contactPerson || "").trim(),
      supportPhone: body.supportPhone ? String(body.supportPhone) : undefined,
      supportWhatsapp: body.supportWhatsapp ? String(body.supportWhatsapp) : undefined,
      fullName: String(body.fullName || tenant.user.fullName || "").trim(),
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update organization settings" },
      { status: 400 },
    );
  }
}
