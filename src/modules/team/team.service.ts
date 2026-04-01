import crypto from "crypto";
import { MemberRole, UserStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { createAuditLog } from "@/modules/audit/audit.service";
import { createInviteToken } from "@/modules/invitations/invitation.service";
import { teamInviteSchema } from "@/modules/settings/settings.schemas";

export async function listTeamMembers(organizationId: string) {
  return db.organizationMember.findMany({
    where: { organizationId },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          phoneNumber: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });
}

export async function inviteTeamMember(args: {
  organizationId: string;
  actorUserId: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
}) {
  const parsed = teamInviteSchema.parse({
    email: args.email,
    fullName: args.fullName,
    phoneNumber: args.phoneNumber || "",
  });
  const passwordHash = await hashPassword(crypto.randomUUID());

  const user = await db.user.upsert({
    where: { email: parsed.email },
    update: {
      fullName: parsed.fullName,
      phoneNumber: parsed.phoneNumber || undefined,
      status: UserStatus.INVITED,
    },
    create: {
      email: parsed.email,
      fullName: parsed.fullName,
      phoneNumber: parsed.phoneNumber || undefined,
      passwordHash,
      status: UserStatus.INVITED,
    },
  });

  const membership = await db.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: args.organizationId,
        userId: user.id,
      },
    },
    update: {
      role: MemberRole.USER,
      invitedAt: new Date(),
      joinedAt: null,
    },
    create: {
      organizationId: args.organizationId,
      userId: user.id,
      role: MemberRole.USER,
      invitedAt: new Date(),
    },
    include: {
      user: true,
    },
  });

  await createAuditLog({
    organizationId: args.organizationId,
    userId: args.actorUserId,
    action: "team_member.invited",
    entityType: "OrganizationMember",
    entityId: membership.id,
    metadata: {
      email: parsed.email,
      role: "TENANT_USER",
    },
  });

  const inviteToken = createInviteToken({
    type: "team_invite",
    organizationId: args.organizationId,
    membershipId: membership.id,
    userId: user.id,
    email: parsed.email,
  });

  return {
    ...membership,
    inviteToken,
    inviteUrl: `${process.env.APP_URL || "http://localhost:3000"}/accept-invite?token=${encodeURIComponent(inviteToken)}`,
  };
}

export async function removeTeamMember(args: {
  organizationId: string;
  actorUserId: string;
  membershipId: string;
}) {
  const membership = await db.organizationMember.findFirstOrThrow({
    where: {
      id: args.membershipId,
      organizationId: args.organizationId,
    },
    include: {
      user: true,
    },
  });

  await db.organizationMember.delete({
    where: { id: membership.id },
  });

  await createAuditLog({
    organizationId: args.organizationId,
    userId: args.actorUserId,
    action: "team_member.removed",
    entityType: "OrganizationMember",
    entityId: membership.id,
    metadata: {
      email: membership.user.email,
      role: membership.role,
    },
  });

  return membership;
}
