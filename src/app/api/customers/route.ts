import { NextRequest, NextResponse } from "next/server";
import { permissions } from "@/modules/authz/permissions";
import { requireTenantPermission } from "@/modules/tenant/tenant-context";
import { createCustomer, listCustomers } from "@/modules/customers/customer.service";

export async function GET() {
  const tenant = await requireTenantPermission(permissions.manageCustomers);
  const customers = await listCustomers(tenant.organizationId);
  return NextResponse.json(customers);
}

export async function POST(request: NextRequest) {
  const tenant = await requireTenantPermission(permissions.manageCustomers);
  const body = await request.json();
  const customer = await createCustomer(tenant.organizationId, body);
  return NextResponse.json(customer);
}
