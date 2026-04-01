import { NextRequest, NextResponse } from "next/server";
import { permissions } from "@/modules/authz/permissions";
import { exportPaymentTransactionsCsv } from "@/modules/payments/payment-ops.service";
import { requireTenantPermission } from "@/modules/tenant/tenant-context";

export async function GET(request: NextRequest) {
  const tenant = await requireTenantPermission(permissions.manageBilling);
  const provider = request.nextUrl.searchParams.get("provider") || undefined;
  const status = request.nextUrl.searchParams.get("status") || undefined;
  const query = request.nextUrl.searchParams.get("query") || undefined;

  const csv = await exportPaymentTransactionsCsv(tenant.organizationId, {
    provider,
    status,
    query,
  });

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="payment-transactions.csv"',
    },
  });
}
