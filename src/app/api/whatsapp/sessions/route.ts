import { NextRequest, NextResponse } from "next/server";
import { permissions } from "@/modules/authz/permissions";
import { requireTenantPermission } from "@/modules/tenant/tenant-context";
import { createWhatsappSession } from "@/modules/whatsapp/whatsapp.service";

export async function POST(request: NextRequest) {
  const tenant = await requireTenantPermission(permissions.manageWhatsapp);
  const body = await request.json();
  const label = String(body.label || "Primary WhatsApp");

  const session = await createWhatsappSession(tenant.organizationId, label);
  return NextResponse.json(session);
}
