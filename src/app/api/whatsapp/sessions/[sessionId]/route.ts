import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTenantContext } from "@/modules/tenant/tenant-context";
import { removeWhatsappSession } from "@/modules/whatsapp/whatsapp.service";

export async function DELETE(_: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const tenant = await requireTenantContext();
  const { sessionId } = await params;

  const session = await db.whatsAppSession.findFirstOrThrow({
    where: {
      id: sessionId,
      organizationId: tenant.organizationId,
    },
  });

  await removeWhatsappSession(session.sessionKey, session.id);

  return NextResponse.json({ ok: true });
}
