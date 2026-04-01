import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { permissions } from "@/modules/authz/permissions";
import { requireTenantPermission } from "@/modules/tenant/tenant-context";
import { createPayoutRequest } from "@/modules/wallet/wallet.service";

export async function POST(request: NextRequest) {
  const tenant = await requireTenantPermission(permissions.manageWallet);
  const body = await request.json();

  try {
    const payout = await createPayoutRequest({
      organizationId: tenant.organizationId,
      actorUserId: tenant.user.id,
      amount: new Prisma.Decimal(String(body.amount || "0")),
      bankName: String(body.bankName || "").trim(),
      accountName: String(body.accountName || "").trim(),
      accountNumber: String(body.accountNumber || "").trim(),
    });
    return NextResponse.json(payout);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create payout request" },
      { status: 400 },
    );
  }
}
