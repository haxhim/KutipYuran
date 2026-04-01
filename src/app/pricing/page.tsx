import { SiteHeader } from "@/components/layout/site-header";
import { Card, CardTitle } from "@/components/ui/card";
import { listPublicPricingPlans } from "@/modules/saas/saas.service";

export default async function PricingPage() {
  const plans = await listPublicPricingPlans();

  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="text-4xl font-bold">Pricing</h1>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id}>
              <CardTitle>{plan.name}</CardTitle>
              <p className="mt-3 text-3xl font-bold">
                RM{Number(plan.priceAmount || plan.priceMonthly).toFixed(2)}/{plan.billingInterval === "YEARLY" ? "year" : "month"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {plan.maxWhatsappSessions} WhatsApp session, {plan.maxImportedCustomers} customers, {plan.maxMessagesPerPeriod} outbound messages.
              </p>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
