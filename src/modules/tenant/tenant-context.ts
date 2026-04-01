import { db } from "@/lib/db";
import { hasPermission } from "@/lib/rbac";
import { getCurrentUser } from "@/lib/auth";
import type { PermissionKey } from "@/modules/authz/permissions";

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

export async function requireTenantPermission(permission: PermissionKey, slug?: string) {
  const tenant = await requireTenantContext(slug);

  if (tenant.user.isPlatformAdmin) {
    return tenant;
  }

  if (!tenant.role || !hasPermission(tenant.role, permission)) {
    throw new Error("Forbidden");
  }

  return tenant;
}
