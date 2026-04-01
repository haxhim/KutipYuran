"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSession } from "@/lib/auth";
import { authenticateUser } from "@/modules/auth/auth.service";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const user = await authenticateUser(email, password);

  if (!user) {
    throw new Error("Invalid credentials");
  }

  const requestHeaders = await headers();
  await createSession(user.id, {
    ipAddress: requestHeaders.get("x-forwarded-for") || undefined,
    userAgent: requestHeaders.get("user-agent") || undefined,
  });

  redirect(user.isPlatformAdmin ? "/admin" : "/app");
}
