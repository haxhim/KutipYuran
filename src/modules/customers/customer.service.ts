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
}) {
  return db.customer.create({
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
}

