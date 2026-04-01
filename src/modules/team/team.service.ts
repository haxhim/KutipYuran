import { db } from "@/lib/db";

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
