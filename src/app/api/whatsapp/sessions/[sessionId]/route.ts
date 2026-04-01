import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { permissions } from "@/modules/authz/permissions";
import { requireTenantPermission } from "@/modules/tenant/tenant-context";
import { removeWhatsappSession } from "@/modules/whatsapp/whatsapp.service";

export async function DELETE(_: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const tenant = await requireTenantPermission(permissions.manageWhatsapp);
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
