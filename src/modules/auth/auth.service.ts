import { MemberRole, UserStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { createOrganizationSlug } from "@/lib/ids";
import { createAuditLog } from "@/modules/audit/audit.service";

export async function registerOrganizationOwner(input: {
  organizationName: string;
  contactPerson: string;
  fullName: string;
  email: string;
  password: string;
}) {
  const slugBase = createOrganizationSlug(input.organizationName);
  const slug = `${slugBase}-${Math.random().toString(36).slice(2, 6)}`;

  const user = await db.user.create({
    data: {
      email: input.email,
      fullName: input.fullName,
      passwordHash: await hashPassword(input.password),
      status: UserStatus.ACTIVE,
      memberships: {
        create: {
          role: MemberRole.USER,
          joinedAt: new Date(),
          organization: {
            create: {
              slug,
              name: input.organizationName,
              contactPerson: input.contactPerson,
              senderDisplayName: input.contactPerson,
              wallet: {
                create: {},
              },
            },
          },
        },
      },
    },
    include: { memberships: true },
  });

  const membership = user.memberships[0];
  await createAuditLog({
    organizationId: membership.organizationId,
    userId: user.id,
    action: "organization.created",
    entityType: "Organization",
    entityId: membership.organizationId,
  });

  return user;
}

export async function authenticateUser(email: string, password: string) {
  const user = await db.user.findUnique({
    where: { email },
  });

  if (!user) return null;
  if (user.status !== UserStatus.ACTIVE) return null;

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) return null;

  return user;
}
