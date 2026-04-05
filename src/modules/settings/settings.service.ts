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

export async function updateWorkspaceProfile(args: {
  organizationId: string;
  actorUserId: string;
  companyName: string;
  contactPerson: string;
  supportPhone?: string;
  supportWhatsapp?: string;
  fullName: string;
}) {
  const result = await db.$transaction(async (tx) => {
    const existingOrganization = await tx.organization.findUniqueOrThrow({
      where: { id: args.organizationId },
      select: {
        senderDisplayName: true,
        messageSignature: true,
      },
    });

    const parsed = organizationSettingsSchema.parse({
      name: args.companyName,
      contactPerson: args.contactPerson,
      supportPhone: args.supportPhone,
      supportWhatsapp: args.supportWhatsapp,
      senderDisplayName: existingOrganization.senderDisplayName || args.companyName,
      messageSignature: existingOrganization.messageSignature || "",
    });

    const organization = await tx.organization.update({
      where: { id: args.organizationId },
      data: {
        name: parsed.name,
        contactPerson: parsed.contactPerson,
        supportPhone: parsed.supportPhone || null,
        supportWhatsapp: parsed.supportWhatsapp || null,
        senderDisplayName: parsed.senderDisplayName,
        messageSignature: existingOrganization.messageSignature,
      },
    });

    const user = await tx.user.update({
      where: { id: args.actorUserId },
      data: {
        fullName: args.fullName.trim(),
      },
    });

    return { organization, user };
  });

  await createAuditLog({
    organizationId: args.organizationId,
    userId: args.actorUserId,
    action: "workspace_profile.updated",
    entityType: "Organization",
    entityId: result.organization.id,
    metadata: {
      companyName: result.organization.name,
      fullName: result.user.fullName,
    },
  });

  return result;
}
