"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AuditFilterBar() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("query") || "");
  const [action, setAction] = useState(searchParams.get("action") || "");
  const [entityType, setEntityType] = useState(searchParams.get("entityType") || "");
  const [actor, setActor] = useState(searchParams.get("actor") || "");

  function applyFilters() {
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (action) params.set("action", action);
    if (entityType) params.set("entityType", entityType);
    if (actor) params.set("actor", actor);
    window.location.assign(`/app/audit-logs?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 md:flex-row">
      <Input onChange={(event) => setQuery(event.target.value)} placeholder="Search actor, action, entity" value={query} />
      <Input onChange={(event) => setAction(event.target.value)} placeholder="Action" value={action} />
      <Input onChange={(event) => setEntityType(event.target.value)} placeholder="Entity type" value={entityType} />
      <select className="h-10 rounded-xl border bg-background px-3 text-sm" onChange={(event) => setActor(event.target.value)} value={actor}>
        <option value="">All Actors</option>
        <option value="USER">USER</option>
        <option value="SYSTEM">SYSTEM</option>
        <option value="WEBHOOK">WEBHOOK</option>
      </select>
      <Button onClick={applyFilters} type="button" variant="outline">
        Apply
      </Button>
    </div>
  );
}
