import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { AdminPricingConsole } from "@/app/admin/pricing/pricing-console";
import { listAdminPricingPlans } from "@/modules/saas/saas.service";

export default async function AdminPricingPage() {
  const plans = await listAdminPricingPlans();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pricing Plans</h1>
        <p className="text-muted-foreground">Create monthly or yearly SaaS plans with enforced tenant usage limits.</p>
      </div>

      <Card>
        <CardTitle>Plan Builder</CardTitle>
        <CardDescription className="mt-2">
          Each plan controls tenant subscription duration, WhatsApp session capacity, customer database size, and outbound message quota.
        </CardDescription>
        <div className="mt-4">
          <AdminPricingConsole
            plans={plans.map((plan) => ({
              id: plan.id,
              key: plan.key,
              name: plan.name,
              billingInterval: plan.billingInterval,
              priceAmount: plan.priceAmount.toString(),
              durationDays: plan.durationDays,
              maxWhatsappSessions: plan.maxWhatsappSessions,
              maxImportedCustomers: plan.maxImportedCustomers,
              maxMessagesPerPeriod: plan.maxMessagesPerPeriod,
              isActive: plan.isActive,
            }))}
          />
        </div>
      </Card>
    </div>
  );
}
