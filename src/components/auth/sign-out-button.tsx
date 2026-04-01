"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";

export function SignOutButton({
  redirectTo = "/login",
  children = "Logout",
  ...props
}: ButtonProps & { redirectTo?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  async function signOut() {
    setError("");
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (!response.ok) {
      setError("Failed to log out.");
      return;
    }

    startTransition(() => {
      window.location.href = redirectTo;
    });
  }

  return (
    <div className="space-y-2">
      <Button {...props} disabled={props.disabled || isPending} onClick={signOut} type="button">
        {children}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
