"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";

type PlanItem = {
  id: string;
  name: string;
  description: string | null;
  amount: string;
  billingType: string;
  dueDayOfMonth: number | null;
  dueIntervalDays: number | null;
  notes: string | null;
  active: boolean;
  currency: string;
};

export function PlansConsole({ plans }: { plans: PlanItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState("");
  const [form, setForm] = useState({
    feePlanId: "",
    name: "",
    description: "",
    amount: "",
  });

  async function savePlan() {
    setStatusMessage("");
    const methodUrl = form.feePlanId ? `/api/fee-plans/${form.feePlanId}` : "/api/fee-plans";
    const response = await fetch(methodUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        description: form.description,
        amount: form.amount,
        billingType: "ONE_TIME",
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setStatusMessage(payload?.error || "Failed to save fee plan.");
      return;
    }
    setStatusMessage("Fee plan saved.");
    setForm({
      feePlanId: "",
      name: "",
      description: "",
      amount: "",
    });
    startTransition(() => router.refresh());
  }

  function resetForm() {
    setForm({
      feePlanId: "",
      name: "",
      description: "",
      amount: "",
    });
  }

  async function deactivatePlan(feePlanId: string) {
    const confirmed = window.confirm("Deactivate this fee plan?");
    if (!confirmed) return;
    setStatusMessage("");
    const response = await fetch(`/api/fee-plans/${feePlanId}`, { method: "DELETE" });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setStatusMessage(payload?.error || "Failed to deactivate fee plan.");
      return;
    }
    setStatusMessage("Fee plan deactivated.");
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Input onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Plan name" value={form.name} />
        <Input onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Short description" value={form.description} />
        <Input onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} placeholder="Amount" value={form.amount} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button disabled={isPending} onClick={savePlan} type="button">
          {form.feePlanId ? "Update Plan" : "Create Plan"}
        </Button>
        {form.feePlanId ? (
          <Button disabled={isPending} onClick={resetForm} type="button" variant="outline">
            Cancel Edit
          </Button>
        ) : null}
      </div>
      {statusMessage ? <div className="rounded-xl border bg-card px-4 py-3 text-sm">{statusMessage}</div> : null}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-3">Plan Name</th>
              <th>Description</th>
              <th>Price</th>
              <th className="py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr key={plan.id} className="border-b">
                <td className="py-3">{plan.name}</td>
                <td>{plan.description || "-"}</td>
                <td>{formatCurrency(plan.amount, plan.currency)}</td>
                <td className="py-3">
                  <div className="flex justify-end gap-2">
                    <Button
                      disabled={isPending}
                      onClick={() =>
                        setForm({
                          feePlanId: plan.id,
                          name: plan.name,
                          description: plan.description || "",
                          amount: plan.amount,
                        })
                      }
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Edit
                    </Button>
                    <Button disabled={isPending} onClick={() => deactivatePlan(plan.id)} size="sm" type="button" variant="destructive">
                      Deactivate
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
