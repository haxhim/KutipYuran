import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";

export function getSignedInHome(user: SessionUser) {
  return user.isPlatformAdmin ? "/admin" : "/app";
}

export function redirectIfSignedIn(user: SessionUser | null) {
  if (!user) {
    return;
  }

  redirect(getSignedInHome(user));
}
