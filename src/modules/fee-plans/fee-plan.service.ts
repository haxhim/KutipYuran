import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { createAuditLog } from "@/modules/audit/audit.service";
import { feePlanSchema } from "@/modules/settings/settings.schemas";

export async function listFeePlans(organizationId: string) {
  return db.feePlan.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: { name: "asc" },
    include: {
      assignments: true,
    },
  });
}

export async function upsertFeePlan(args: {
  organizationId: string;
  actorUserId: string;
  feePlanId?: string;
  payload: unknown;
}) {
  const parsed = feePlanSchema.parse(args.payload);
  const existingPlan = args.feePlanId
    ? await db.feePlan.findFirstOrThrow({
        where: {
          id: args.feePlanId,
          organizationId: args.organizationId,
        },
      })
    : null;

  const plan = existingPlan
    ? await db.feePlan.update({
        where: { id: existingPlan.id },
        data: {
          name: parsed.name,
          description: parsed.description || null,
          amount: new Prisma.Decimal(parsed.amount),
          billingType: parsed.billingType,
          dueDayOfMonth: parsed.dueDayOfMonth ?? null,
          dueIntervalDays: parsed.dueIntervalDays ?? null,
          notes: parsed.notes || null,
          active: parsed.active ?? true,
          deletedAt: null,
        },
      })
    : await db.feePlan.create({
        data: {
          organizationId: args.organizationId,
          name: parsed.name,
          description: parsed.description || null,
          amount: new Prisma.Decimal(parsed.amount),
          billingType: parsed.billingType,
          dueDayOfMonth: parsed.dueDayOfMonth ?? null,
          dueIntervalDays: parsed.dueIntervalDays ?? null,
          notes: parsed.notes || null,
          active: parsed.active ?? true,
        },
      });

  await createAuditLog({
    organizationId: args.organizationId,
    userId: args.actorUserId,
    action: args.feePlanId ? "fee_plan.updated" : "fee_plan.created",
    entityType: "FeePlan",
    entityId: plan.id,
    metadata: {
      name: plan.name,
      amount: plan.amount.toString(),
      billingType: plan.billingType,
    },
  });

  return plan;
}

export async function deactivateFeePlan(args: {
  organizationId: string;
  actorUserId: string;
  feePlanId: string;
}) {
  const existingPlan = await db.feePlan.findFirstOrThrow({
    where: {
      id: args.feePlanId,
      organizationId: args.organizationId,
    },
  });

  const plan = await db.feePlan.update({
    where: { id: existingPlan.id },
    data: {
      active: false,
      deletedAt: new Date(),
    },
  });

  await createAuditLog({
    organizationId: args.organizationId,
    userId: args.actorUserId,
    action: "fee_plan.deactivated",
    entityType: "FeePlan",
    entityId: plan.id,
  });

  return plan;
}
