import { NextRequest, NextResponse } from "next/server";
import { permissions } from "@/modules/authz/permissions";
import { updateOrganizationSettings } from "@/modules/settings/settings.service";
import { requireTenantPermission } from "@/modules/tenant/tenant-context";

export async function POST(request: NextRequest) {
  const tenant = await requireTenantPermission(permissions.manageOrganizationSettings);
  const body = await request.json();

  try {
    const organization = await updateOrganizationSettings({
      organizationId: tenant.organizationId,
      actorUserId: tenant.user.id,
      name: String(body.name || "").trim(),
      contactPerson: String(body.contactPerson || "").trim(),
      supportPhone: body.supportPhone ? String(body.supportPhone) : undefined,
      supportWhatsapp: body.supportWhatsapp ? String(body.supportWhatsapp) : undefined,
      senderDisplayName: String(body.senderDisplayName || "").trim(),
      messageSignature: body.messageSignature ? String(body.messageSignature) : undefined,
    });
    return NextResponse.json(organization);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update organization settings" },
      { status: 400 },
    );
  }
}
