import { NextRequest, NextResponse } from "next/server";
import { PaymentProvider } from "@prisma/client";
import { permissions } from "@/modules/authz/permissions";
import { testProviderConfig } from "@/modules/integrations/integration.service";
import { requireTenantPermission } from "@/modules/tenant/tenant-context";

export async function POST(request: NextRequest) {
  const tenant = await requireTenantPermission(permissions.manageIntegrations);
  const body = await request.json();

  try {
    const result = await testProviderConfig({
      organizationId: tenant.organizationId,
      provider: (body.provider || "MANUAL") as PaymentProvider,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to test integration config" },
      { status: 400 },
    );
  }
}
