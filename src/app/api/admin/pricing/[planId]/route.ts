import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { setSaaSPlanActive } from "@/modules/saas/saas.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ planId: string }> }) {
  const user = await getCurrentUser();
  if (!user?.isPlatformAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { planId } = await params;

  try {
    const plan = await setSaaSPlanActive({
      actorUserId: user.id,
      planId,
      isActive: Boolean(body.isActive),
    });
    return NextResponse.json(plan);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update plan status" },
      { status: 400 },
    );
  }
}
