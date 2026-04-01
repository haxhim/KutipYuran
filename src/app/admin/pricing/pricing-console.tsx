"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Plan = {
  id: string;
  key: string;
  name: string;
  billingInterval: "MONTHLY" | "YEARLY";
  priceAmount: string;
  durationDays: number;
  maxWhatsappSessions: number;
  maxImportedCustomers: number;
  maxMessagesPerPeriod: number;
  isActive: boolean;
};

export function AdminPricingConsole({ plans }: { plans: Plan[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState("");
  const [form, setForm] = useState({
    planId: "",
    key: "",
    name: "",
    billingInterval: "MONTHLY",
    priceAmount: "",
    durationDays: "30",
    maxWhatsappSessions: "1",
    maxImportedCustomers: "500",
    maxMessagesPerPeriod: "1000",
    isActive: true,
  });

  async function savePlan() {
    const response = await fetch("/api/admin/pricing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setStatusMessage(payload?.error || "Failed to save pricing plan.");
      return;
    }

    setStatusMessage("Pricing plan saved.");
    setForm({
      planId: "",
      key: "",
      name: "",
      billingInterval: "MONTHLY",
      priceAmount: "",
      durationDays: "30",
      maxWhatsappSessions: "1",
      maxImportedCustomers: "500",
      maxMessagesPerPeriod: "1000",
      isActive: true,
    });
    startTransition(() => router.refresh());
  }

  async function togglePlan(planId: string, isActive: boolean) {
    const response = await fetch(`/api/admin/pricing/${planId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setStatusMessage(payload?.error || "Failed to update plan status.");
      return;
    }

    setStatusMessage(`Plan ${isActive ? "activated" : "deactivated"}.`);
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Input onChange={(event) => setForm((current) => ({ ...current, key: event.target.value }))} placeholder="plan_key" value={form.key} />
        <Input onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Plan name" value={form.name} />
        <select className="h-10 rounded-xl border bg-background px-3 text-sm" onChange={(event) => setForm((current) => ({ ...current, billingInterval: event.target.value as "MONTHLY" | "YEARLY" }))} value={form.billingInterval}>
          <option value="MONTHLY">MONTHLY</option>
          <option value="YEARLY">YEARLY</option>
        </select>
        <Input onChange={(event) => setForm((current) => ({ ...current, priceAmount: event.target.value }))} placeholder="Price amount" value={form.priceAmount} />
        <Input onChange={(event) => setForm((current) => ({ ...current, durationDays: event.target.value }))} placeholder="Duration days" value={form.durationDays} />
        <Input onChange={(event) => setForm((current) => ({ ...current, maxWhatsappSessions: event.target.value }))} placeholder="WhatsApp sessions" value={form.maxWhatsappSessions} />
        <Input onChange={(event) => setForm((current) => ({ ...current, maxImportedCustomers: event.target.value }))} placeholder="Imported customers" value={form.maxImportedCustomers} />
        <Input onChange={(event) => setForm((current) => ({ ...current, maxMessagesPerPeriod: event.target.value }))} placeholder="Message limit" value={form.maxMessagesPerPeriod} />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button disabled={isPending} onClick={savePlan} type="button">
          {form.planId ? "Update Plan" : "Create Plan"}
        </Button>
      </div>
      {statusMessage ? <div className="rounded-xl border bg-card px-4 py-3 text-sm">{statusMessage}</div> : null}
      <div className="space-y-3">
        {plans.map((plan) => (
          <div className="rounded-xl bg-muted p-4 text-sm" key={plan.id}>
            <p className="font-medium">{plan.name}</p>
            <p>{plan.billingInterval} | RM {plan.priceAmount} | {plan.durationDays} days</p>
            <p>Sessions: {plan.maxWhatsappSessions} | Customers: {plan.maxImportedCustomers} | Messages: {plan.maxMessagesPerPeriod}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                disabled={isPending}
                onClick={() =>
                  setForm({
                    planId: plan.id,
                    key: plan.key,
                    name: plan.name,
                    billingInterval: plan.billingInterval,
                    priceAmount: plan.priceAmount,
                    durationDays: String(plan.durationDays),
                    maxWhatsappSessions: String(plan.maxWhatsappSessions),
                    maxImportedCustomers: String(plan.maxImportedCustomers),
                    maxMessagesPerPeriod: String(plan.maxMessagesPerPeriod),
                    isActive: plan.isActive,
                  })
                }
                size="sm"
                type="button"
                variant="outline"
              >
                Edit
              </Button>
              <Button disabled={isPending} onClick={() => togglePlan(plan.id, !plan.isActive)} size="sm" type="button" variant={plan.isActive ? "destructive" : "outline"}>
                {plan.isActive ? "Deactivate" : "Activate"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
