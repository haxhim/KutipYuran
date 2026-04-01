"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSession, getCurrentUser } from "@/lib/auth";
import { getSignedInHome } from "@/lib/auth-redirects";
import { authenticateUser } from "@/modules/auth/auth.service";

export async function loginAction(formData: FormData) {
  const existingUser = await getCurrentUser();
  if (existingUser) {
    redirect(getSignedInHome(existingUser));
  }

  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const user = await authenticateUser(email, password);

  if (!user) {
    redirect(`/login?error=invalid_credentials&email=${encodeURIComponent(email)}`);
  }

  const requestHeaders = await headers();
  await createSession(user.id, {
    ipAddress: requestHeaders.get("x-forwarded-for") || undefined,
    userAgent: requestHeaders.get("user-agent") || undefined,
  });

  redirect(user.isPlatformAdmin ? "/admin" : "/app");
}
