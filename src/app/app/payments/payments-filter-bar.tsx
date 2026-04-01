"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PaymentsFilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("query") || "");
  const [provider, setProvider] = useState(searchParams.get("provider") || "ALL");
  const [status, setStatus] = useState(searchParams.get("status") || "ALL");

  function applyFilters() {
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (provider && provider !== "ALL") params.set("provider", provider);
    if (status && status !== "ALL") params.set("status", status);
    router.push(`/app/payments?${params.toString()}`);
  }

  const exportHref = `/api/payments/export?${new URLSearchParams({
    ...(query ? { query } : {}),
    ...(provider !== "ALL" ? { provider } : {}),
    ...(status !== "ALL" ? { status } : {}),
  }).toString()}`;

  return (
    <div className="flex flex-col gap-3 md:flex-row">
      <Input onChange={(event) => setQuery(event.target.value)} placeholder="Search customer or reference" value={query} />
      <select className="h-10 rounded-xl border bg-background px-3 text-sm" onChange={(event) => setProvider(event.target.value)} value={provider}>
        <option value="ALL">All Providers</option>
        <option value="MANUAL">Manual</option>
        <option value="CHIP">CHIP</option>
        <option value="TOYYIBPAY">ToyyibPay</option>
      </select>
      <select className="h-10 rounded-xl border bg-background px-3 text-sm" onChange={(event) => setStatus(event.target.value)} value={status}>
        <option value="ALL">All Statuses</option>
        <option value="PENDING">Pending</option>
        <option value="PAID">Paid</option>
        <option value="FAILED">Failed</option>
        <option value="CANCELLED">Cancelled</option>
        <option value="REFUNDED">Refunded</option>
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
