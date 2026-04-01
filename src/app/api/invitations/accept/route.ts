import { NextRequest, NextResponse } from "next/server";
import { acceptInvite } from "@/modules/invitations/invitation.service";

export async function POST(request: NextRequest) {
  const body = await request.json();

  try {
    await acceptInvite({
      token: String(body.token || ""),
      fullName: String(body.fullName || ""),
      password: String(body.password || ""),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to accept invite" },
      { status: 400 },
    );
  }
}
