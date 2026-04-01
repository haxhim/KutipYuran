import { AuditActorType } from "@prisma/client";
import { db } from "@/lib/db";

export async function createAuditLog(input: {
  organizationId?: string;
  userId?: string;
  actorType?: AuditActorType;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: unknown;
}) {
  return db.auditLog.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId,
      actorType: input.actorType || AuditActorType.SYSTEM,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata as object | undefined,
    },
  });
}

export async function listAuditLogs(organizationId: string, args?: { action?: string; entityType?: string; limit?: number }) {
  return db.auditLog.findMany({
    where: {
      organizationId,
      action: args?.action || undefined,
      entityType: args?.entityType || undefined,
    },
    orderBy: { createdAt: "desc" },
    take: args?.limit || 100,
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  });
}
