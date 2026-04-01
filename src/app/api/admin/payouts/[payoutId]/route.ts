import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { processPayoutRequest } from "@/modules/wallet/wallet.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ payoutId: string }> }) {
  const user = await getCurrentUser();
  if (!user?.isPlatformAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { payoutId } = await params;
  const body = await request.json();

  try {
    const payout = await processPayoutRequest({
      payoutRequestId: payoutId,
      status: String(body.status || "").toUpperCase() as "APPROVED" | "REJECTED" | "COMPLETED",
      adminUserId: user.id,
      adminNote: body.adminNote ? String(body.adminNote) : undefined,
    });
    return NextResponse.json(payout);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process payout request" },
      { status: 400 },
    );
  }
}
