"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function UserDatabaseConsole({
  rows,
  plans,
}: {
  rows: Array<{
    organizationId: string;
    organizationName: string;
    contactPerson: string;
    ownerFullName: string;
    ownerEmail: string;
    suspended: boolean;
    currentPlanId: string;
    currentDurationDays?: number;
  }>;
  plans: Array<{ id: string; name: string; billingInterval: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState("");
  const [editingOrganizationId, setEditingOrganizationId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{
    organizationName: string;
    contactPerson: string;
    ownerFullName: string;
    ownerEmail: string;
    planId: string;
    durationDays: string;
  }>({
    organizationName: "",
    contactPerson: "",
    ownerFullName: "",
    ownerEmail: "",
    planId: "",
    durationDays: "",
  });

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
    setEditingOrganizationId(null);
    startTransition(() => router.refresh());
  }

  function openEdit(row: (typeof rows)[number]) {
    setEditingOrganizationId(row.organizationId);
    setDraft({
      organizationName: row.organizationName,
      contactPerson: row.contactPerson,
      ownerFullName: row.ownerFullName,
      ownerEmail: row.ownerEmail,
      planId: row.currentPlanId,
      durationDays: row.currentDurationDays ? String(row.currentDurationDays) : "",
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {rows.map((row) => (
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
            <Button disabled={isPending} onClick={() => openEdit(row)} size="sm" type="button" variant="outline">
              Edit
            </Button>
          </div>
        ))}
      </div>
      {editingOrganizationId ? (
        <div className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2">
          <Input
            onChange={(event) => setDraft((current) => ({ ...current, organizationName: event.target.value }))}
            placeholder="Organization name"
            value={draft.organizationName}
          />
          <Input
            onChange={(event) => setDraft((current) => ({ ...current, contactPerson: event.target.value }))}
            placeholder="Contact person"
            value={draft.contactPerson}
          />
          <Input
            onChange={(event) => setDraft((current) => ({ ...current, ownerFullName: event.target.value }))}
            placeholder="Owner full name"
            value={draft.ownerFullName}
          />
          <Input
            onChange={(event) => setDraft((current) => ({ ...current, ownerEmail: event.target.value }))}
            placeholder="Owner email"
            type="email"
            value={draft.ownerEmail}
          />
          <select
            className="h-10 rounded-xl border bg-background px-3 text-sm"
            onChange={(event) => setDraft((current) => ({ ...current, planId: event.target.value }))}
            value={draft.planId}
          >
            <option value="">Keep current plan</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} ({plan.billingInterval})
              </option>
            ))}
          </select>
          <Input
            min="1"
            onChange={(event) => setDraft((current) => ({ ...current, durationDays: event.target.value }))}
            placeholder="Duration in days"
            type="number"
            value={draft.durationDays}
          />
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <Button
              disabled={isPending}
              onClick={() =>
                updateTenantAccount(editingOrganizationId, {
                  organizationName: draft.organizationName,
                  contactPerson: draft.contactPerson,
                  ownerFullName: draft.ownerFullName,
                  ownerEmail: draft.ownerEmail,
                  planId: draft.planId || undefined,
                  durationDays: draft.durationDays ? Number(draft.durationDays) : undefined,
                })
              }
              size="sm"
              type="button"
            >
              Save Changes
            </Button>
            <Button disabled={isPending} onClick={() => setEditingOrganizationId(null)} size="sm" type="button" variant="outline">
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
      {statusMessage ? <div className="rounded-xl border bg-card px-4 py-3 text-sm">{statusMessage}</div> : null}
    </div>
  );
}
