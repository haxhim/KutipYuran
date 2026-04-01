import { SiteHeader } from "@/components/layout/site-header";

export default function FeaturesPage() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="text-4xl font-bold">Features</h1>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {[
            "Tenant-isolated billing and customer management",
            "WhatsApp session management and blast safety controls",
            "CHIP, ToyyibPay, and manual payment support",
            "Organization wallet, ledger, and payout requests",
            "CSV import preview with row-level validation",
            "Admin controls for queues, payouts, and feature flags",
          ].map((item) => (
            <div key={item} className="rounded-2xl border bg-card p-6">
              {item}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

