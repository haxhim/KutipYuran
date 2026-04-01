import { NextResponse } from "next/server";
import { getHealthStatus } from "@/modules/health/health.service";

export async function GET() {
  const status = await getHealthStatus();
  return NextResponse.json(status);
}

