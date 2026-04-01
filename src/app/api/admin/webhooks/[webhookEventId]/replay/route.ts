import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { replayWebhookEvent } from "@/modules/admin/admin.service";

export async function POST(_: Request, { params }: { params: Promise<{ webhookEventId: string }> }) {
  const user = await getCurrentUser();
  if (!user?.isPlatformAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { webhookEventId } = await params;

  try {
    const result = await replayWebhookEvent(webhookEventId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to replay webhook" },
      { status: 400 },
    );
  }
}
