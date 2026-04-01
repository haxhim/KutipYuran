"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type WhatsappSessionItem = {
  id: string;
  label: string;
  status: string;
  qrCodeDataUrl: string | null;
  lastActiveAt: string | null;
  phoneNumber: string | null;
};

export function WhatsappConsole({ sessions }: { sessions: WhatsappSessionItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newLabel, setNewLabel] = useState("Primary WhatsApp");
  const [testNumbers, setTestNumbers] = useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = useState<string>("");

  async function createSession() {
    setStatusMessage("");
    const response = await fetch("/api/whatsapp/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newLabel }),
    });

    if (!response.ok) {
      setStatusMessage("Failed to create WhatsApp session.");
      return;
    }

    setStatusMessage("WhatsApp session created. QR should appear shortly.");
    startTransition(() => router.refresh());
  }

  async function refreshSession(sessionId: string) {
    setStatusMessage("");
    const response = await fetch(`/api/whatsapp/sessions/${sessionId}/refresh`, {
      method: "POST",
    });

    if (!response.ok) {
      setStatusMessage("Failed to refresh WhatsApp session.");
      return;
    }

    setStatusMessage("Session refresh requested. If not connected yet, scan the latest QR.");
    startTransition(() => router.refresh());
  }

  async function sendTest(sessionId: string) {
    setStatusMessage("");
    const phoneNumber = testNumbers[sessionId]?.trim();

    if (!phoneNumber) {
      setStatusMessage("Please enter a WhatsApp number first.");
      return;
    }

    const response = await fetch(`/api/whatsapp/sessions/${sessionId}/test-send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setStatusMessage(payload?.error || "Failed to send test message.");
      return;
    }

    setStatusMessage(`Test message sent to ${phoneNumber}. Remove this helper later if you do not need it anymore.`);
  }

  async function removeSession(sessionId: string, label: string) {
    const confirmed = window.confirm(`Delete WhatsApp session "${label}"? This will remove the linked device session from this app.`);
    if (!confirmed) {
      return;
    }

    setStatusMessage("");
    const response = await fetch(`/api/whatsapp/sessions/${sessionId}`, {
      method: "DELETE",
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setStatusMessage(payload?.error || "Failed to delete WhatsApp session.");
      return;
    }

    setStatusMessage(`WhatsApp session "${label}" deleted.`);
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle>Create WhatsApp Session</CardTitle>
        <CardDescription className="mt-2">
          Create a tenant-linked WhatsApp session, then scan the QR below from your phone.
        </CardDescription>
        <p className="mt-3 text-sm text-muted-foreground">
          Bulk reminder blasting now runs from{" "}
          <Link className="font-semibold text-primary" href="/app/campaigns">
            Campaigns
          </Link>
          {" "}after your WhatsApp session is connected.
        </p>
        <div className="mt-4 flex flex-col gap-3 md:flex-row">
          <Input value={newLabel} onChange={(event) => setNewLabel(event.target.value)} placeholder="Session label" />
          <Button disabled={isPending} onClick={createSession} type="button">
            Create Session
          </Button>
        </div>
      </Card>

      {statusMessage ? (
        <div className="rounded-xl border bg-card px-4 py-3 text-sm">{statusMessage}</div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {sessions.length ? (
          sessions.map((session) => (
            <Card key={session.id} className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>{session.label}</CardTitle>
                  <CardDescription className="mt-2">
                    Last active: {session.lastActiveAt ? new Date(session.lastActiveAt).toLocaleString() : "-"}
                  </CardDescription>
                </div>
                <Badge>{session.status}</Badge>
              </div>

              {session.qrCodeDataUrl ? (
                <div className="rounded-2xl border bg-white p-4">
                  <img alt={`QR for ${session.label}`} className="mx-auto h-56 w-56 object-contain" src={session.qrCodeDataUrl} />
                </div>
              ) : (
                <div className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                  QR not available yet. Create or refresh the session to generate a new QR.
                </div>
              )}

              <div className="flex flex-col gap-3 md:flex-row">
                <Button disabled={isPending} onClick={() => refreshSession(session.id)} type="button" variant="outline">
                  Refresh Session
                </Button>
                <Button
                  disabled={isPending}
                  onClick={() => removeSession(session.id, session.label)}
                  type="button"
                  variant="destructive"
                >
                  Delete Session
                </Button>
              </div>

              <div className="rounded-xl bg-muted p-4">
                <p className="text-sm font-semibold">Direct Test Send</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter a WhatsApp number and send a one-off verification message from this session before running a full campaign.
                </p>
                <div className="mt-3 flex flex-col gap-3 md:flex-row">
                  <Input
                    placeholder="6012XXXXXXXX"
                    value={testNumbers[session.id] || ""}
                    onChange={(event) =>
                      setTestNumbers((current) => ({
                        ...current,
                        [session.id]: event.target.value,
                      }))
                    }
                  />
                  <Button disabled={isPending} onClick={() => sendTest(session.id)} type="button">
                    Send Test Message
                  </Button>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card>
            <CardTitle>No WhatsApp session yet</CardTitle>
            <CardDescription className="mt-2">
              Create your first session to generate a QR and start sending reminder messages.
            </CardDescription>
          </Card>
        )}
      </div>
    </div>
  );
}
