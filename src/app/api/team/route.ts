import { NextRequest, NextResponse } from "next/server";
import { MemberRole } from "@prisma/client";
import { permissions } from "@/modules/authz/permissions";
import { inviteTeamMember } from "@/modules/team/team.service";
import { requireTenantPermission } from "@/modules/tenant/tenant-context";

export async function POST(request: NextRequest) {
  const tenant = await requireTenantPermission(permissions.manageTeam);
  const body = await request.json();

  try {
    const member = await inviteTeamMember({
      organizationId: tenant.organizationId,
      actorUserId: tenant.user.id,
      email: String(body.email || "").trim(),
      fullName: String(body.fullName || "").trim(),
      role: (body.role || "USER") as MemberRole,
      phoneNumber: body.phoneNumber ? String(body.phoneNumber) : undefined,
    });
    return NextResponse.json(member);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to invite team member" },
      { status: 400 },
    );
  }
}
