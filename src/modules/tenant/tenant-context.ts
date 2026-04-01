import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function requireTenantContext(slug?: string) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  let organizationId: string | null = user.memberships[0]?.organizationId ?? null;

  if (slug) {
    const organization = await db.organization.findUnique({
      where: { slug },
      select: { id: true },
    });
    organizationId = organization?.id ?? null;
  }

  if (!organizationId) {
    throw new Error("Organization not found");
  }

  const membership = user.memberships.find((item) => item.organizationId === organizationId);

  if (!membership && !user.isPlatformAdmin) {
    throw new Error("Forbidden");
  }

  return {
    user,
    organizationId,
    role: membership?.role,
  };
}
