"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export function GatewayToggleConsole({
  gateways,
}: {
  gateways: Array<{
    provider: "CHIP" | "TOYYIBPAY";
    platformReady: boolean;
    isEnabledForOrganization: boolean;
    updatedAt: string | Date | null;
    baseUrl: string;
    missingKeys: string[];
  }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState("");

  async function saveToggle(provider: "CHIP" | "TOYYIBPAY", isEnabled: boolean) {
    setStatusMessage("");
    const response = await fetch("/api/integrations/gateways", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, isEnabled }),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setStatusMessage(payload?.error || `Failed to update ${provider}.`);
      return;
    }

    setStatusMessage(`${provider} ${isEnabled ? "enabled" : "disabled"} for this organization.`);
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      {gateways.map((gateway) => (
        <div className="rounded-2xl border bg-card p-5 shadow-sm" key={gateway.provider}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold">{gateway.provider}</p>
              <p className="mt-1 text-sm text-muted-foreground">Platform endpoint: {gateway.baseUrl}</p>
              <p className="mt-1 text-sm">
                Platform status: {gateway.platformReady ? "Ready from env" : `Missing env keys: ${gateway.missingKeys.join(", ") || "-"}`}
              </p>
              <p className="mt-1 text-sm">
                Tenant status: {gateway.isEnabledForOrganization ? "Enabled" : "Disabled"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Last changed: {gateway.updatedAt ? new Date(gateway.updatedAt).toLocaleString() : "Never"}
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                checked={gateway.isEnabledForOrganization}
                className="h-4 w-4"
                disabled={isPending || !gateway.platformReady}
                onChange={(event) => saveToggle(gateway.provider, event.target.checked)}
                type="checkbox"
              />
              Enabled for tenant
            </label>
          </div>
          {!gateway.platformReady ? (
            <div className="mt-3 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
              Ask platform admin to complete env setup before enabling this provider.
            </div>
          ) : null}
        </div>
      ))}
      {statusMessage ? <div className="rounded-xl border bg-card px-4 py-3 text-sm">{statusMessage}</div> : null}
    </div>
  );
}
