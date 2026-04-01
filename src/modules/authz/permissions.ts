import { MemberRole } from "@prisma/client";

export const permissions = {
  manageCustomers: "manage_customers",
  manageBilling: "manage_billing",
  createCampaigns: "create_campaigns",
  manageIntegrations: "manage_integrations",
  viewReports: "view_reports",
  manageTeam: "manage_team",
  verifyManualPayments: "verify_manual_payments",
  manageOrganizationSettings: "manage_organization_settings",
  managePricingAndLimits: "manage_pricing_and_limits",
  manageWallet: "manage_wallet",
  viewAuditLogs: "view_audit_logs",
  manageWhatsapp: "manage_whatsapp",
} as const;

export type PermissionKey = (typeof permissions)[keyof typeof permissions];

const tenantPermissions: PermissionKey[] = [
  permissions.manageCustomers,
  permissions.manageBilling,
  permissions.createCampaigns,
  permissions.manageIntegrations,
  permissions.viewReports,
  permissions.manageTeam,
  permissions.verifyManualPayments,
  permissions.manageOrganizationSettings,
  permissions.managePricingAndLimits,
  permissions.manageWallet,
  permissions.viewAuditLogs,
  permissions.manageWhatsapp,
];

const rolePermissions: Record<MemberRole, PermissionKey[]> = {
  ADMIN: tenantPermissions,
  USER: tenantPermissions,
};

export function roleHasPermission(role: MemberRole, permission: PermissionKey) {
  return rolePermissions[role]?.includes(permission) ?? false;
}
