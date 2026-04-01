import { NextRequest, NextResponse } from "next/server";
import { PaymentProvider } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { testEnvGatewayConnection } from "@/modules/integrations/integration.service";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.isPlatformAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();

  try {
    const result = await testEnvGatewayConnection((body.provider || "CHIP") as PaymentProvider);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to test gateway env connection" },
      { status: 400 },
    );
  }
}
