import jwt from "jsonwebtoken";
import { UserStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { createSession, hashPassword } from "@/lib/auth";
import { createAuditLog } from "@/modules/audit/audit.service";
import { inviteAcceptanceSchema } from "@/modules/settings/settings.schemas";

type InvitePayload = {
  type: "team_invite";
  organizationId: string;
  membershipId: string;
  userId: string;
  email: string;
};

export function createInviteToken(input: InvitePayload) {
  return jwt.sign(input, env.JWT_SECRET, { expiresIn: "7d" });
}

export function verifyInviteToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as InvitePayload;
}

export async function acceptInvite(input: {
  token: string;
  fullName: string;
  password: string;
}) {
  const parsed = inviteAcceptanceSchema.parse(input);
  const payload = verifyInviteToken(parsed.token);

  if (payload.type !== "team_invite") {
    throw new Error("Invalid invite token");
  }

  const membership = await db.organizationMember.findFirstOrThrow({
    where: {
      id: payload.membershipId,
      organizationId: payload.organizationId,
      userId: payload.userId,
    },
    include: {
      user: true,
    },
  });

  if (membership.joinedAt || membership.user.status !== UserStatus.INVITED) {
    throw new Error("This invite has already been accepted.");
  }

  const hashedPassword = await hashPassword(parsed.password);
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: payload.userId },
      data: {
        fullName: parsed.fullName,
        passwordHash: hashedPassword,
        status: UserStatus.ACTIVE,
      },
    });

    await tx.organizationMember.update({
      where: { id: membership.id },
      data: {
        joinedAt: new Date(),
      },
    });
  });

  await createAuditLog({
    organizationId: payload.organizationId,
    userId: payload.userId,
    action: "team_member.accepted_invite",
    entityType: "OrganizationMember",
    entityId: membership.id,
    metadata: {
      email: payload.email,
    },
  });

  await createSession(payload.userId);

  return membership;
}
