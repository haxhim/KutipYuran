"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export function AdminPayoutConsole({ payoutIds }: { payoutIds: string[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState("");

  async function processPayout(payoutId: string, status: "APPROVED" | "REJECTED" | "COMPLETED") {
    const adminNote = window.prompt(`Admin note for ${status.toLowerCase()} action`, "") || "";
    setStatusMessage("");
    const response = await fetch(`/api/admin/payouts/${payoutId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, adminNote }),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setStatusMessage(payload?.error || `Failed to ${status.toLowerCase()} payout.`);
      return;
    }

    setStatusMessage(`Payout ${status.toLowerCase()} successfully.`);
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {payoutIds.slice(0, 5).map((payoutId) => (
          <div className="flex gap-2" key={payoutId}>
            <Button disabled={isPending} onClick={() => processPayout(payoutId, "APPROVED")} size="sm" type="button" variant="outline">
              Approve {payoutId.slice(0, 6)}
            </Button>
            <Button disabled={isPending} onClick={() => processPayout(payoutId, "REJECTED")} size="sm" type="button" variant="destructive">
              Reject
            </Button>
            <Button disabled={isPending} onClick={() => processPayout(payoutId, "COMPLETED")} size="sm" type="button">
              Complete
            </Button>
          </div>
        ))}
      </div>
      {statusMessage ? <div className="rounded-xl border bg-card px-4 py-3 text-sm">{statusMessage}</div> : null}
    </div>
  );
}
