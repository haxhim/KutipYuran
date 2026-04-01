"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type CampaignItem = {
  id: string;
  name: string;
  status: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
};

export function CampaignsConsole({
  campaigns,
  connectedSessions,
  eligibleBillings,
}: {
  campaigns: CampaignItem[];
  connectedSessions: number;
  eligibleBillings: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [campaignName, setCampaignName] = useState(`Reminder Blast ${new Date().toLocaleDateString()}`);
  const [statusMessage, setStatusMessage] = useState("");

  async function createCampaign(startNow: boolean) {
    setStatusMessage("");
    const response = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: campaignName }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setStatusMessage(payload?.error || "Failed to create reminder campaign.");
      return;
    }

    if (startNow) {
      const startResponse = await fetch(`/api/campaigns/${payload.id}/start`, { method: "POST" });
      const startPayload = await startResponse.json().catch(() => null);

      if (!startResponse.ok) {
        setStatusMessage(startPayload?.error || "Campaign created, but starting it failed.");
        startTransition(() => router.refresh());
        return;
      }

      setStatusMessage("Campaign created and queued for WhatsApp sending.");
      startTransition(() => router.refresh());
      return;
    }

    setStatusMessage("Campaign draft created. Start it when you are ready.");
    startTransition(() => router.refresh());
  }

  async function startCampaign(campaignId: string) {
    setStatusMessage("");
    const response = await fetch(`/api/campaigns/${campaignId}/start`, { method: "POST" });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setStatusMessage(payload?.error || "Failed to start campaign.");
      return;
    }

    setStatusMessage("Campaign queued. Make sure the worker process is running to deliver messages.");
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div>
          <CardTitle>Blast Unpaid Billings</CardTitle>
          <CardDescription className="mt-2">
            Build a reminder campaign from billings that are still unpaid, then queue the WhatsApp blast through the worker.
          </CardDescription>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-muted p-4 text-sm">
            <p className="font-semibold">{eligibleBillings}</p>
            <p className="text-muted-foreground">Eligible unpaid billings</p>
          </div>
          <div className="rounded-xl bg-muted p-4 text-sm">
            <p className="font-semibold">{connectedSessions}</p>
            <p className="text-muted-foreground">Connected WhatsApp sessions</p>
          </div>
          <div className="rounded-xl bg-muted p-4 text-sm">
            <p className="font-semibold">{campaigns.length}</p>
            <p className="text-muted-foreground">Campaign records</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          <Input onChange={(event) => setCampaignName(event.target.value)} value={campaignName} />
          <Button disabled={isPending || !eligibleBillings} onClick={() => createCampaign(false)} type="button" variant="outline">
            Save Draft
          </Button>
          <Button disabled={isPending || !eligibleBillings || !connectedSessions} onClick={() => createCampaign(true)} type="button">
            Blast Now
          </Button>
        </div>

        {!connectedSessions ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm">
            Connect at least one WhatsApp session first before starting a blast.
          </div>
        ) : null}

        {statusMessage ? <div className="rounded-xl border bg-card px-4 py-3 text-sm">{statusMessage}</div> : null}
      </Card>

      <Card>
        <CardTitle>Reminder campaigns</CardTitle>
        <div className="mt-4 space-y-3">
          {campaigns.length ? (
            campaigns.map((campaign) => (
              <div key={campaign.id} className="rounded-xl bg-muted p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">{campaign.name}</p>
                    <p className="text-muted-foreground">Created: {new Date(campaign.createdAt).toLocaleString()}</p>
                    <p>
                      Recipients: {campaign.totalRecipients} | Sent: {campaign.sentCount} | Failed: {campaign.failedCount}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 md:items-end">
                    <Badge>{campaign.status}</Badge>
                    {campaign.status === "DRAFT" || campaign.status === "PAUSED" ? (
                      <Button disabled={isPending || !connectedSessions} onClick={() => startCampaign(campaign.id)} size="sm" type="button">
                        Start Campaign
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
              No campaigns yet. Create one from the unpaid billing list above.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
