import { registerAction } from "@/app/register/actions";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getCurrentUser } from "@/lib/auth";
import { redirectIfSignedIn } from "@/lib/auth-redirects";
import { listPublicPricingPlans } from "@/modules/saas/saas.service";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  redirectIfSignedIn(user);
  const plans = await listPublicPricingPlans();

  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-xl px-6 py-16">
        <Card>
          <CardTitle>Create Organization and Pay First</CardTitle>
          <form action={registerAction} className="mt-6 grid gap-4">
            <Input name="organizationName" placeholder="Organization name" required />
            <Input name="contactPerson" placeholder="Contact person" required />
            <Input name="fullName" placeholder="Your full name" required />
            <Input name="email" type="email" placeholder="Email" required />
            <Input name="password" type="password" placeholder="Password" required />
            <select className="h-10 rounded-xl border bg-background px-3 text-sm" name="planId" required>
              <option value="">Select a pricing plan</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} - RM{Number(plan.priceAmount || plan.priceMonthly).toFixed(2)} / {plan.billingInterval === "YEARLY" ? "year" : "month"}
                </option>
              ))}
            </select>
            <Button type="submit">Proceed to Payment</Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
