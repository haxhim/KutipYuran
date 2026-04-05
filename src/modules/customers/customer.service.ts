import { db } from "@/lib/db";
import { normalizeMalaysiaPhone } from "@/lib/phone";

export async function listCustomers(organizationId: string) {
  return db.customer.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      tags: true,
      planAssignments: {
        include: { feePlan: true },
      },
    },
  });
}

export async function createCustomer(organizationId: string, input: {
  fullName: string;
  firstName?: string;
  email?: string;
  phoneNumber: string;
  notes?: string;
  planAssignments?: Array<{
    feePlanId: string;
    quantity: number;
  }>;
}) {
  return db.$transaction(async (tx) => {
    const customer = await tx.customer.create({
      data: {
        organizationId,
        fullName: input.fullName,
        firstName: input.firstName,
        email: input.email || null,
        phoneNumber: input.phoneNumber,
        normalizedWhatsapp: normalizeMalaysiaPhone(input.phoneNumber),
        notes: input.notes,
      },
    });

    for (const assignment of input.planAssignments || []) {
      if (!assignment.feePlanId || assignment.quantity <= 0) {
        continue;
      }

      await tx.customerPlanAssignment.create({
        data: {
          organizationId,
          customerId: customer.id,
          feePlanId: assignment.feePlanId,
          quantity: assignment.quantity,
          active: true,
        },
      });
    }

    return customer;
  });
}
