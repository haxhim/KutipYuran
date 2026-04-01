import { SiteHeader } from "@/components/layout/site-header";
import { Card, CardTitle } from "@/components/ui/card";

export default function PricingPage() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="text-4xl font-bold">Pricing</h1>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            ["Starter", "RM79/month", "1 WhatsApp session, up to 500 customers"],
            ["Pro", "RM199/month", "3 team members, gateway support, analytics"],
            ["Business", "RM399/month", "Priority support, advanced reporting, more limits"],
          ].map(([name, price, desc]) => (
            <Card key={name}>
              <CardTitle>{name}</CardTitle>
              <p className="mt-3 text-3xl font-bold">{price}</p>
              <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}

