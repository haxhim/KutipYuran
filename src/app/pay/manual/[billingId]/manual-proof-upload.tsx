"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export function ManualProofUpload({ billingId }: { billingId: string }) {
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);

  function uploadProof() {
    if (!file) {
      setStatusMessage("Please choose a proof file first.");
      return;
    }

    startTransition(async () => {
      setStatusMessage("");
      const formData = new FormData();
      formData.append("proof", file);

      const response = await fetch(`/api/manual-payments/${billingId}/proof`, {
        method: "POST",
        body: formData,
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setStatusMessage(payload?.error || "Failed to upload proof.");
        return;
      }

      setStatusMessage(`Proof uploaded successfully. Reference ${payload?.referenceNo || ""}`);
      setFile(null);
    });
  }

  return (
    <div className="space-y-3">
      <input
        accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
        onChange={(event) => setFile(event.target.files?.[0] || null)}
        type="file"
      />
      <div>
        <Button disabled={isPending} onClick={uploadProof} type="button">
          Upload Proof
        </Button>
      </div>
      {statusMessage ? <div className="rounded-xl border bg-card px-4 py-3 text-sm">{statusMessage}</div> : null}
    </div>
  );
}
