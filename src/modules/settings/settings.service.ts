import { db } from "@/lib/db";
import { createAuditLog } from "@/modules/audit/audit.service";
import { organizationSettingsSchema } from "@/modules/settings/settings.schemas";

export async function getOrganizationSettings(organizationId: string) {
  return db.organization.findUniqueOrThrow({
    where: { id: organizationId },
    include: {
      whatsappSessions: true,
      paymentProviderConfig: true,
      subscriptions: {
        include: { saasPlan: true },
        orderBy: { createdAt: "desc" },
      },
      wallet: true,
      payoutRequests: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
}

export async function updateOrganizationSettings(args: {
  organizationId: string;
  actorUserId: string;
  name: string;
  contactPerson: string;
  supportPhone?: string;
  supportWhatsapp?: string;
  senderDisplayName: string;
  messageSignature?: string;
}) {
  const parsed = organizationSettingsSchema.parse(args);
  const organization = await db.organization.update({
    where: { id: args.organizationId },
    data: {
      name: parsed.name,
      contactPerson: parsed.contactPerson,
      supportPhone: parsed.supportPhone || null,
      supportWhatsapp: parsed.supportWhatsapp || null,
      senderDisplayName: parsed.senderDisplayName,
      messageSignature: parsed.messageSignature || null,
    },
  });

  await createAuditLog({
    organizationId: args.organizationId,
    userId: args.actorUserId,
    action: "organization_settings.updated",
    entityType: "Organization",
    entityId: organization.id,
    metadata: {
      name: organization.name,
      senderDisplayName: organization.senderDisplayName,
    },
  });

  return organization;
}
