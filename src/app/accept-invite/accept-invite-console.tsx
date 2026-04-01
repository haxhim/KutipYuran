"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AcceptInviteConsole({ inviteEmail, token }: { inviteEmail: string; token: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    password: "",
  });

  async function activateAccount() {
    setStatusMessage("");
    const response = await fetch("/api/invitations/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        fullName: form.fullName,
        password: form.password,
      }),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setStatusMessage(payload?.error || "Failed to activate your account.");
      return;
    }

    setStatusMessage("Account activated. Redirecting...");
    startTransition(() => {
      router.push("/app");
      router.refresh();
    });
  }

  return (
    <div className="mt-6 grid gap-4">
      <Input disabled type="email" value={inviteEmail} />
      <Input
        minLength={2}
        onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
        placeholder="Full name"
        required
        value={form.fullName}
      />
      <Input
        minLength={8}
        onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
        placeholder="Create password"
        required
        type="password"
        value={form.password}
      />
      <Button disabled={isPending || form.fullName.trim().length < 2 || form.password.length < 8} onClick={activateAccount} type="button">
        Activate Account
      </Button>
      {statusMessage ? <div className="rounded-xl border bg-card px-4 py-3 text-sm">{statusMessage}</div> : null}
    </div>
  );
}
