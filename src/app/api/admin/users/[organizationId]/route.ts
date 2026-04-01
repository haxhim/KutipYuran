import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { adminUpdateTenantAccount } from "@/modules/saas/saas.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ organizationId: string }> }) {
  const user = await getCurrentUser();
  if (!user?.isPlatformAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { organizationId } = await params;

  try {
    await adminUpdateTenantAccount({
      organizationId,
      actorUserId: user.id,
      planId: body.planId ? String(body.planId) : undefined,
      durationDays: body.durationDays ? Number(body.durationDays) : undefined,
      suspended: typeof body.suspended === "boolean" ? body.suspended : undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update tenant account" },
      { status: 400 },
    );
  }
}
