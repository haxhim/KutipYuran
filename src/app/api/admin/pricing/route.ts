import { NextRequest, NextResponse } from "next/server";
import { SaaSBillingInterval } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { upsertSaaSPlan } from "@/modules/saas/saas.service";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.isPlatformAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();

  try {
    const plan = await upsertSaaSPlan({
      actorUserId: user.id,
      planId: body.planId ? String(body.planId) : undefined,
      payload: {
        key: String(body.key || "").trim(),
        name: String(body.name || "").trim(),
        billingInterval: (body.billingInterval || "MONTHLY") as SaaSBillingInterval,
        priceAmount: Number(body.priceAmount || 0),
        durationDays: Number(body.durationDays || 30),
        maxWhatsappSessions: Number(body.maxWhatsappSessions || 1),
        maxImportedCustomers: Number(body.maxImportedCustomers || 500),
        maxMessagesPerPeriod: Number(body.maxMessagesPerPeriod || 1000),
        isActive: Boolean(body.isActive ?? true),
      },
    });
    return NextResponse.json(plan);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save pricing plan" },
      { status: 400 },
    );
  }
}
