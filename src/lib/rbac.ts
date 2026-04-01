import { MemberRole } from "@prisma/client";

const rolePermissions: Record<MemberRole, string[]> = {
  ADMIN: [
    "manage_customers",
    "manage_billing",
    "create_campaigns",
    "manage_integrations",
    "view_reports",
    "manage_team",
    "verify_manual_payments",
    "manage_organization_settings",
    "manage_pricing_and_limits",
    "manage_wallet",
  ],
  USER: [
    "manage_customers",
    "manage_billing",
    "create_campaigns",
    "view_reports",
  ],
};

export function hasPermission(role: MemberRole, permission: string) {
  const permissions = rolePermissions[role] || [];
  return permissions.includes("*") || permissions.includes(permission);
}
