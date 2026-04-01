import { NextResponse } from "next/server";
import { permissions } from "@/modules/authz/permissions";
import { removeTeamMember } from "@/modules/team/team.service";
import { requireTenantPermission } from "@/modules/tenant/tenant-context";

export async function DELETE(_: Request, { params }: { params: Promise<{ membershipId: string }> }) {
  const tenant = await requireTenantPermission(permissions.manageTeam);
  const { membershipId } = await params;

  try {
    const removed = await removeTeamMember({
      organizationId: tenant.organizationId,
      actorUserId: tenant.user.id,
      membershipId,
    });
    return NextResponse.json({ ok: true, email: removed.user.email });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to remove member" },
      { status: 400 },
    );
  }
}
