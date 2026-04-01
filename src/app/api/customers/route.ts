import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext } from "@/modules/tenant/tenant-context";
import { createCustomer, listCustomers } from "@/modules/customers/customer.service";

export async function GET() {
  const tenant = await requireTenantContext();
  const customers = await listCustomers(tenant.organizationId);
  return NextResponse.json(customers);
}

export async function POST(request: NextRequest) {
  const tenant = await requireTenantContext();
  const body = await request.json();
  const customer = await createCustomer(tenant.organizationId, body);
  return NextResponse.json(customer);
}

