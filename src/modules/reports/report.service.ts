import { BillingRecordStatus, PaymentProvider, ReminderCampaignStatus } from "@prisma/client";
import { db } from "@/lib/db";

const unpaidStatuses: BillingRecordStatus[] = [
  BillingRecordStatus.PENDING,
  BillingRecordStatus.UNPAID,
  BillingRecordStatus.OVERDUE,
  BillingRecordStatus.PARTIAL,
];

export async function getReportSummary(organizationId: string) {
  const [billings, payments, campaigns, feePlans] = await Promise.all([
    db.billingRecord.findMany({
      where: { organizationId },
      include: { customer: true },
    }),
    db.paymentTransaction.findMany({
      where: { organizationId },
    }),
    db.reminderCampaign.findMany({
      where: { organizationId },
    }),
    db.feePlan.findMany({
      where: { organizationId, deletedAt: null },
      include: {
        assignments: true,
      },
    }),
  ]);

  return {
    totalBillings: billings.length,
    overdueBillings: billings.filter((item) => item.status === BillingRecordStatus.OVERDUE).length,
    unpaidBillings: billings.filter((item) => unpaidStatuses.includes(item.status)).length,
    totalPayments: payments.length,
    paidPayments: payments.filter((item) => item.status === "PAID").length,
    paymentsByProvider: Object.values(PaymentProvider).map((provider) => ({
      provider,
      count: payments.filter((item) => item.provider === provider).length,
    })),
    campaignSummary: {
      total: campaigns.length,
      completed: campaigns.filter((item) => item.status === ReminderCampaignStatus.COMPLETED).length,
      running: campaigns.filter((item) => item.status === ReminderCampaignStatus.RUNNING).length,
      failed: campaigns.filter((item) => item.failedCount > 0).length,
    },
    planSummary: feePlans.map((plan) => ({
      name: plan.name,
      assignments: plan.assignments.length,
      amount: plan.amount.toString(),
    })),
  };
}
