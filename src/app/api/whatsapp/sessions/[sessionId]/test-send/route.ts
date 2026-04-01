import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizeMalaysiaPhone } from "@/lib/phone";
import { requireTenantContext } from "@/modules/tenant/tenant-context";
import { getOrCreateWhatsappClient, sendWhatsappMessage } from "@/modules/whatsapp/whatsapp.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const tenant = await requireTenantContext();
  const { sessionId } = await params;
  const body = await request.json();
  const phoneNumber = normalizeMalaysiaPhone(String(body.phoneNumber || ""));

  if (!phoneNumber) {
    return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
  }

  const session = await db.whatsAppSession.findFirstOrThrow({
    where: {
      id: sessionId,
      organizationId: tenant.organizationId,
    },
  });

  await getOrCreateWhatsappClient(session.sessionKey, session.id, tenant.organizationId);

  const message =
    String(body.message || "").trim() ||
    "Ini adalah test message sementara dari KutipYuran. Fungsi ini boleh dibuang kemudian selepas pengesahan WhatsApp berjaya.";

  const result = await sendWhatsappMessage(session.sessionKey, phoneNumber, message);

  return NextResponse.json({
    ok: true,
    messageId: result.id?._serialized || null,
  });
}

