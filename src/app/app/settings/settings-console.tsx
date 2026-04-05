"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SettingsConsole({
  initialValues,
}: {
  initialValues: {
    companyName: string;
    fullName: string;
    email: string;
    contactPerson: string;
    supportPhone: string;
    supportWhatsapp: string;
  };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState("");
  const [form, setForm] = useState(initialValues);

  async function saveSettings() {
    setStatusMessage("");
    const response = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setStatusMessage(payload?.error || "Failed to update settings.");
      return;
    }
    setStatusMessage("Organization settings updated.");
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Input onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))} placeholder="Company name" value={form.companyName} />
        <Input onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} placeholder="Your full name" value={form.fullName} />
        <Input disabled placeholder="Email" value={form.email} />
        <Input onChange={(event) => setForm((current) => ({ ...current, contactPerson: event.target.value }))} placeholder="Contact person" value={form.contactPerson} />
        <Input onChange={(event) => setForm((current) => ({ ...current, supportPhone: event.target.value }))} placeholder="Support phone" value={form.supportPhone} />
        <Input onChange={(event) => setForm((current) => ({ ...current, supportWhatsapp: event.target.value }))} placeholder="Support WhatsApp" value={form.supportWhatsapp} />
      </div>
      <Button disabled={isPending} onClick={saveSettings} type="button">
        Save Settings
      </Button>
      {statusMessage ? <div className="rounded-xl border bg-card px-4 py-3 text-sm">{statusMessage}</div> : null}
    </div>
  );
}
