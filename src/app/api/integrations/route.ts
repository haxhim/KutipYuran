import { NextRequest, NextResponse } from "next/server";
import { permissions } from "@/modules/authz/permissions";
import { requireTenantPermission } from "@/modules/tenant/tenant-context";
import { upsertProviderConfig } from "@/modules/integrations/integration.service";

export async function POST(request: NextRequest) {
  const tenant = await requireTenantPermission(permissions.manageIntegrations);
  const body = await request.json();

  try {
    const config = await upsertProviderConfig({
      organizationId: tenant.organizationId,
      actorUserId: tenant.user.id,
      payload: body,
    });
    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update integration config" },
      { status: 400 },
    );
  }
}
