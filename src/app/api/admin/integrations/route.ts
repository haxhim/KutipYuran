import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { upsertProviderConfig } from "@/modules/integrations/integration.service";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.isPlatformAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();

  try {
    const config = await upsertProviderConfig({
      actorUserId: user.id,
      scope: "GLOBAL",
      payload: body,
    });
    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update global integration config" },
      { status: 400 },
    );
  }
}
