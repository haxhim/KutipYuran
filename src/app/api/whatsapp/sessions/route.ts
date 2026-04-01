import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext } from "@/modules/tenant/tenant-context";
import { createWhatsappSession } from "@/modules/whatsapp/whatsapp.service";

export async function POST(request: NextRequest) {
  const tenant = await requireTenantContext();
  const body = await request.json();
  const label = String(body.label || "Primary WhatsApp");

  const session = await createWhatsappSession(tenant.organizationId, label);
  return NextResponse.json(session);
}

