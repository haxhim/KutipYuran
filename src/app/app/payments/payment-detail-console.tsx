"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export function PaymentDetailConsole({
  transactionId,
  proofs,
  canVerifyManualProofs,
}: {
  transactionId: string;
  proofs: Array<{ id: string; verifiedAt: string | null; downloadUrl: string; note: string | null }>;
  canVerifyManualProofs: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState("");

  async function reconcile() {
    setStatusMessage("");
    const response = await fetch(`/api/payments/${transactionId}/reconcile`, { method: "POST" });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setStatusMessage(payload?.error || "Failed to reconcile payment transaction.");
      return;
    }

    setStatusMessage(`Reconciliation completed. Current status: ${payload?.status || "updated"}.`);
    startTransition(() => router.refresh());
  }

  async function verifyProof(proofId: string) {
    setStatusMessage("");
    const response = await fetch(`/api/payments/proofs/${proofId}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setStatusMessage(payload?.error || "Failed to verify manual proof.");
      return;
    }

    setStatusMessage("Manual payment proof verified and transaction marked paid.");
    startTransition(() => router.refresh());
  }

  async function rejectProof(proofId: string) {
    const note = window.prompt("Reason for rejecting this proof?", "");
    setStatusMessage("");
    const response = await fetch(`/api/payments/proofs/${proofId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setStatusMessage(payload?.error || "Failed to reject manual proof.");
      return;
    }

    setStatusMessage("Manual payment proof rejected and transaction updated.");
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <Button disabled={isPending} onClick={reconcile} type="button" variant="outline">
          Reconcile With Provider
        </Button>
        {proofs.map((proof) => (
          <a className="inline-flex items-center justify-center rounded-xl border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted" href={proof.downloadUrl} key={`${proof.id}-download`}>
            Download Proof {proof.id.slice(0, 6)}
          </a>
        ))}
        {canVerifyManualProofs
          ? proofs
              .filter((proof) => !proof.verifiedAt)
              .map((proof) => (
                <div className="flex gap-2" key={proof.id}>
                  <Button disabled={isPending} onClick={() => verifyProof(proof.id)} type="button">
                    Verify Proof {proof.id.slice(0, 6)}
                  </Button>
                  <Button disabled={isPending} onClick={() => rejectProof(proof.id)} type="button" variant="destructive">
                    Reject
                  </Button>
                </div>
              ))
          : null}
      </div>
      {statusMessage ? <div className="rounded-xl border bg-card px-4 py-3 text-sm">{statusMessage}</div> : null}
    </div>
  );
}
