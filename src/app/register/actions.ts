"use server";

import { redirect } from "next/navigation";
import { createSession } from "@/lib/auth";
import { registerOrganizationOwner } from "@/modules/auth/auth.service";

export async function registerAction(formData: FormData) {
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

