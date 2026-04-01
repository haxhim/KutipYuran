import { BillingRecordStatus, PaymentMode, PaymentProvider, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { generateReference } from "@/lib/ids";
import { decimalToNumber, roundMoney } from "@/lib/money";

export async function generateBillingForCustomer(organizationId: string, customerId: string, dueDate: Date) {
  const assignments = await db.customerPlanAssignment.findMany({
    where: { organizationId, customerId, active: true },
    include: { feePlan: true, customer: true },
  });

  if (!assignments.length) {
    throw new Error("No active fee plans found");
  }

  const subtotal = assignments.reduce((sum, assignment) => {
    return sum + roundMoney(decimalToNumber(assignment.feePlan.amount) * assignment.quantity);
  }, 0);

  return db.billingRecord.create({
    data: {
      organizationId,
      customerId,
      referenceNo: generateReference("KY-INV"),
      status: BillingRecordStatus.PENDING,
      dueDate,
      subtotalAmount: new Prisma.Decimal(subtotal),
      totalAmount: new Prisma.Decimal(subtotal),
      paymentMode: PaymentMode.HYBRID,
      preferredProvider: PaymentProvider.MANUAL,
      items: {
        create: assignments.map((assignment) => ({
          organizationId,
          feePlanId: assignment.feePlanId,
          title: assignment.feePlan.name,
          quantity: assignment.quantity,
          unitAmount: assignment.feePlan.amount,
          totalAmount: new Prisma.Decimal(decimalToNumber(assignment.feePlan.amount) * assignment.quantity),
        })),
      },
    },
    include: { items: true, customer: true },
  });
}

export async function getDashboardMetrics(organizationId: string) {
  const [billings, wallet, campaigns, recentTransactions] = await Promise.all([
    db.billingRecord.findMany({
      where: { organizationId },
      select: { status: true, totalAmount: true, amountPaid: true },
    }),
    db.organizationWallet.findUnique({ where: { organizationId } }),
    db.reminderCampaign.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.paymentTransaction.findMany({
      where: { organizationId, status: BillingRecordStatus.PAID },
      orderBy: { paidAt: "desc" },
      take: 5,
      include: {
        billingRecord: {
          include: { customer: true },
        },
      },
    }),
  ]);

  const totalBilled = billings.reduce((sum, record) => sum + decimalToNumber(record.totalAmount), 0);
  const totalCollected = billings.reduce((sum, record) => sum + decimalToNumber(record.amountPaid), 0);
  const overdueAmount = billings
    .filter((record) => record.status === BillingRecordStatus.OVERDUE)
    .reduce((sum, record) => sum + decimalToNumber(record.totalAmount), 0);

  return {
    totalBilled,
    totalCollected,
    totalUnpaid: roundMoney(totalBilled - totalCollected),
    overdueAmount,
    wallet,
    campaigns,
    recentTransactions,
  };
}
