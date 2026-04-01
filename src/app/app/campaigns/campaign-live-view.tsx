"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export function CampaignLiveView({
  autoRefresh = true,
}: {
  autoRefresh?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [auto, setAuto] = useState(autoRefresh);

  useEffect(() => {
    if (!auto) return;
    const timer = window.setInterval(() => {
      startTransition(() => router.refresh());
    }, 5000);

    return () => window.clearInterval(timer);
  }, [auto, router, startTransition]);

  return (
    <div className="flex flex-wrap gap-3">
      <Button disabled={isPending} onClick={() => startTransition(() => router.refresh())} type="button" variant="outline">
        Refresh Progress
      </Button>
      <Button onClick={() => setAuto((current) => !current)} type="button" variant="outline">
        {auto ? "Auto Refresh On" : "Auto Refresh Off"}
      </Button>
    </div>
  );
}
