"use server";

import { redirect } from "next/navigation";
import { createSession, getCurrentUser } from "@/lib/auth";
import { getSignedInHome } from "@/lib/auth-redirects";
import { registerOrganizationOwner } from "@/modules/auth/auth.service";

export async function registerAction(formData: FormData) {
  const existingUser = await getCurrentUser();
  if (existingUser) {
    redirect(getSignedInHome(existingUser));
  }

  const user = await registerOrganizationOwner({
    organizationName: String(formData.get("organizationName") || ""),
    contactPerson: String(formData.get("contactPerson") || ""),
    fullName: String(formData.get("fullName") || ""),
    email: String(formData.get("email") || ""),
    password: String(formData.get("password") || ""),
  });

  await createSession(user.id);
  redirect("/app");
}
