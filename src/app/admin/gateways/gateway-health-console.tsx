"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export function GatewayHealthConsole({
  providers,
}: {
  providers: Array<{ provider: "CHIP" | "TOYYIBPAY" }>;
}) {
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState<Record<string, string>>({});

  async function testProvider(provider: "CHIP" | "TOYYIBPAY") {
    const response = await fetch("/api/admin/integrations/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    });
    const payload = await response.json().catch(() => null);

    startTransition(() => {
      setResults((current) => ({
        ...current,
        [provider]: payload?.message || payload?.error || `Failed to test ${provider}.`,
      }));
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {providers.map((item) => (
          <Button disabled={isPending} key={item.provider} onClick={() => testProvider(item.provider)} type="button" variant="outline">
            Test {item.provider}
          </Button>
        ))}
      </div>
      {Object.entries(results).map(([provider, message]) => (
        <div className="rounded-xl border bg-card px-4 py-3 text-sm" key={provider}>
          <span className="font-medium">{provider}:</span> {message}
        </div>
      ))}
    </div>
  );
}
