"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TeamConsole({ members }: { members: Array<{ id: string; role: string; email: string }> }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    role: "USER",
  });

  async function inviteMember() {
    setStatusMessage("");
    const response = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setStatusMessage(payload?.error || "Failed to invite member.");
      return;
    }
    setStatusMessage(`Invited ${payload?.user?.email || form.email}.`);
    setInviteUrl(payload?.inviteUrl || "");
    setForm({ fullName: "", email: "", phoneNumber: "", role: "USER" });
    startTransition(() => router.refresh());
  }

  async function removeMember(membershipId: string, email: string) {
    const confirmed = window.confirm(`Remove ${email} from the team?`);
    if (!confirmed) return;

    setStatusMessage("");
    const response = await fetch(`/api/team/${membershipId}`, { method: "DELETE" });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setStatusMessage(payload?.error || "Failed to remove member.");
      return;
    }
    setStatusMessage(`Removed ${email}.`);
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Input onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} placeholder="Full name" value={form.fullName} />
        <Input onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="Email" value={form.email} />
        <Input onChange={(event) => setForm((current) => ({ ...current, phoneNumber: event.target.value }))} placeholder="Phone number" value={form.phoneNumber} />
        <select className="h-10 rounded-xl border bg-background px-3 text-sm" onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))} value={form.role}>
          <option value="USER">USER</option>
          <option value="ADMIN">ADMIN</option>
        </select>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button disabled={isPending} onClick={inviteMember} type="button">
          Invite Member
        </Button>
      </div>
      {statusMessage ? <div className="rounded-xl border bg-card px-4 py-3 text-sm">{statusMessage}</div> : null}
      {inviteUrl ? (
        <div className="rounded-xl border bg-card px-4 py-3 text-sm">
          <p className="font-medium">Invite link</p>
          <p className="mt-1 text-muted-foreground">Share this link with the invited teammate so they can set their password and activate access.</p>
          <a className="mt-2 inline-block break-all text-primary underline-offset-4 hover:underline" href={inviteUrl}>
            {inviteUrl}
          </a>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {members.map((member) => (
          <Button disabled={isPending} key={member.id} onClick={() => removeMember(member.id, member.email)} size="sm" type="button" variant="outline">
            Remove {member.email}
          </Button>
        ))}
      </div>
    </div>
  );
}
