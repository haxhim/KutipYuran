import { db } from "@/lib/db";
import { requireTenantContext } from "@/modules/tenant/tenant-context";
import { WhatsappConsole } from "@/app/app/whatsapp/whatsapp-console";

export default async function WhatsappPage() {
  const tenant = await requireTenantContext();
  const sessions = await db.whatsAppSession.findMany({
    where: { organizationId: tenant.organizationId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">WhatsApp Connection</h1>
      <WhatsappConsole
        sessions={sessions.map((session) => ({
          id: session.id,
          label: session.label,
          status: session.status,
          qrCodeDataUrl: session.qrCodeDataUrl,
          lastActiveAt: session.lastActiveAt?.toISOString() || null,
          phoneNumber: session.phoneNumber,
        }))}
      />
    </div>
  );
}
