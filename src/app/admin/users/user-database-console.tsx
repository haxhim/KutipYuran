"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export function UserDatabaseConsole({
  organizations,
  plans,
}: {
  organizations: Array<{ organizationId: string; suspended: boolean }>;
  plans: Array<{ id: string; name: string; billingInterval: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState("");

  async function updateTenantAccount(organizationId: string, payload: Record<string, unknown>) {
    const response = await fetch(`/api/admin/users/${organizationId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => null);

    if (!response.ok) {
      setStatusMessage(result?.error || "Failed to update tenant account.");
      return;
    }

    setStatusMessage("Tenant account updated.");
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {organizations.map((row) => (
          <div className="flex flex-wrap gap-2" key={row.organizationId}>
            <select
              className="h-9 rounded-lg border bg-background px-3 text-sm"
              defaultValue=""
              onChange={(event) => {
                const planId = event.target.value;
                if (!planId) {
                  return;
                }
                updateTenantAccount(row.organizationId, { planId });
                event.target.value = "";
              }}
            >
              <option value="">Assign Plan</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} ({plan.billingInterval})
                </option>
              ))}
            </select>
            <Button
              disabled={isPending}
              onClick={() => updateTenantAccount(row.organizationId, { suspended: !row.suspended })}
              size="sm"
              type="button"
              variant={row.suspended ? "outline" : "destructive"}
            >
              {row.suspended ? "Activate" : "Ban / Deactivate"}
            </Button>
          </div>
        ))}
      </div>
      {statusMessage ? <div className="rounded-xl border bg-card px-4 py-3 text-sm">{statusMessage}</div> : null}
    </div>
  );
}
