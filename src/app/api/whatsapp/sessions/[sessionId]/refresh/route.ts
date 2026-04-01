import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTenantContext } from "@/modules/tenant/tenant-context";
import { getOrCreateWhatsappClient } from "@/modules/whatsapp/whatsapp.service";

export async function POST(_: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const tenant = await requireTenantContext();
  const { sessionId } = await params;
  const session = await db.whatsAppSession.findFirstOrThrow({
    where: { id: sessionId, organizationId: tenant.organizationId },
  });

  await getOrCreateWhatsappClient(session.sessionKey, session.id, tenant.organizationId);
  return NextResponse.json({ ok: true });
}

