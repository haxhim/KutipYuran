"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RecipientFilterBar({ campaignId }: { campaignId: string }) {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("query") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "ALL");

  function applyFilters() {
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (status && status !== "ALL") params.set("status", status);
    window.location.assign(`/app/campaigns/${campaignId}?${params.toString()}`);
  }

  const exportHref = `/api/campaigns/${campaignId}/recipients/export?${new URLSearchParams({
    ...(query ? { query } : {}),
    ...(status !== "ALL" ? { status } : {}),
  }).toString()}`;

  return (
    <div className="flex flex-col gap-3 md:flex-row">
      <Input onChange={(event) => setQuery(event.target.value)} placeholder="Search recipient or billing reference" value={query} />
      <select className="h-10 rounded-xl border bg-background px-3 text-sm" onChange={(event) => setStatus(event.target.value)} value={status}>
        <option value="ALL">All Statuses</option>
        <option value="QUEUED">Queued</option>
        <option value="PROCESSING">Processing</option>
        <option value="SENT">Sent</option>
        <option value="DELIVERED">Delivered</option>
        <option value="FAILED">Failed</option>
        <option value="SKIPPED">Skipped</option>
        <option value="CANCELLED">Cancelled</option>
      </select>
      <Button onClick={applyFilters} type="button" variant="outline">
        Apply
      </Button>
      <a className="inline-flex h-10 items-center justify-center rounded-xl border bg-card px-4 text-sm font-semibold hover:bg-muted" href={exportHref}>
        Export CSV
      </a>
    </div>
  );
}
