"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PayoutConsole() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState("");
  const [form, setForm] = useState({
    amount: "",
    bankName: "",
    accountName: "",
    accountNumber: "",
  });

  async function requestPayout() {
    setStatusMessage("");
    const response = await fetch("/api/subscription/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setStatusMessage(payload?.error || "Failed to create payout request.");
      return;
    }
    setStatusMessage("Payout request submitted.");
    setForm({ amount: "", bankName: "", accountName: "", accountNumber: "" });
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Input onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} placeholder="Amount" value={form.amount} />
        <Input onChange={(event) => setForm((current) => ({ ...current, bankName: event.target.value }))} placeholder="Bank name" value={form.bankName} />
        <Input onChange={(event) => setForm((current) => ({ ...current, accountName: event.target.value }))} placeholder="Account name" value={form.accountName} />
        <Input onChange={(event) => setForm((current) => ({ ...current, accountNumber: event.target.value }))} placeholder="Account number" value={form.accountNumber} />
      </div>
      <Button disabled={isPending} onClick={requestPayout} type="button">
        Request Payout
      </Button>
      {statusMessage ? <div className="rounded-xl border bg-card px-4 py-3 text-sm">{statusMessage}</div> : null}
    </div>
  );
}
