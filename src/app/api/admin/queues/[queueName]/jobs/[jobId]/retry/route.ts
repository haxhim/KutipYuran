import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { retryFailedQueueJob } from "@/modules/admin/admin.service";

export async function POST(_: Request, { params }: { params: Promise<{ queueName: string; jobId: string }> }) {
  const user = await getCurrentUser();
  if (!user?.isPlatformAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { queueName, jobId } = await params;

  try {
    const result = await retryFailedQueueJob(queueName, jobId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to retry queue job" },
      { status: 400 },
    );
  }
}
