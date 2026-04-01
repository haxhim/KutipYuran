import { MemberRole } from "@prisma/client";
import { roleHasPermission, type PermissionKey } from "@/modules/authz/permissions";

export function hasPermission(role: MemberRole, permission: PermissionKey) {
  return roleHasPermission(role, permission);
}
