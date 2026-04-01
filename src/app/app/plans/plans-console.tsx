"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    billingType: "ONE_TIME",
    dueDayOfMonth: "",
    dueIntervalDays: "",
    notes: "",
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
        billingType: form.billingType,
        dueDayOfMonth: form.dueDayOfMonth || undefined,
        dueIntervalDays: form.dueIntervalDays || undefined,
        notes: form.notes,
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
      billingType: "ONE_TIME",
      dueDayOfMonth: "",
      dueIntervalDays: "",
      notes: "",
    });
    startTransition(() => router.refresh());
  }

  function resetForm() {
    setForm({
      feePlanId: "",
      name: "",
      description: "",
      amount: "",
      billingType: "ONE_TIME",
      dueDayOfMonth: "",
      dueIntervalDays: "",
      notes: "",
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
        <select className="h-10 rounded-xl border bg-background px-3 text-sm" onChange={(event) => setForm((current) => ({ ...current, billingType: event.target.value }))} value={form.billingType}>
          <option value="ONE_TIME">ONE_TIME</option>
          <option value="RECURRING_MONTHLY">RECURRING_MONTHLY</option>
          <option value="RECURRING_CUSTOM">RECURRING_CUSTOM</option>
        </select>
        <Input onChange={(event) => setForm((current) => ({ ...current, dueDayOfMonth: event.target.value }))} placeholder="Due day of month" value={form.dueDayOfMonth} />
        <Input onChange={(event) => setForm((current) => ({ ...current, dueIntervalDays: event.target.value }))} placeholder="Due interval days" value={form.dueIntervalDays} />
        <Input onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Notes" value={form.notes} />
      </div>
      <Button disabled={isPending} onClick={savePlan} type="button">
        {form.feePlanId ? "Update Plan" : "Create Plan"}
      </Button>
      {form.feePlanId ? (
        <Button disabled={isPending} onClick={resetForm} type="button" variant="outline">
          Cancel Edit
        </Button>
      ) : null}
      {statusMessage ? <div className="rounded-xl border bg-card px-4 py-3 text-sm">{statusMessage}</div> : null}
      <div className="flex flex-wrap gap-2">
        {plans.map((plan) => (
          <div className="flex gap-2" key={plan.id}>
            <Button
              disabled={isPending}
              onClick={() =>
                setForm({
                  feePlanId: plan.id,
                  name: plan.name,
                  description: plan.description || "",
                  amount: plan.amount,
                  billingType: plan.billingType,
                  dueDayOfMonth: plan.dueDayOfMonth?.toString() || "",
                  dueIntervalDays: plan.dueIntervalDays?.toString() || "",
                  notes: plan.notes || "",
                })
              }
              size="sm"
              type="button"
              variant="outline"
            >
              Edit {plan.name}
            </Button>
            <Button disabled={isPending} onClick={() => deactivatePlan(plan.id)} size="sm" type="button" variant="destructive">
              Deactivate
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
