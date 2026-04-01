"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getSignedInHome } from "@/lib/auth-redirects";
import { createRegistrationCheckout } from "@/modules/saas/saas.service";

export async function registerAction(formData: FormData) {
  const existingUser = await getCurrentUser();
  if (existingUser) {
    redirect(getSignedInHome(existingUser));
  }

  const checkout = await createRegistrationCheckout({
    organizationName: String(formData.get("organizationName") || ""),
    contactPerson: String(formData.get("contactPerson") || ""),
    fullName: String(formData.get("fullName") || ""),
    email: String(formData.get("email") || ""),
    password: String(formData.get("password") || ""),
    planId: String(formData.get("planId") || ""),
  });

  redirect((checkout.checkoutUrl || `/pay/return?kind=saas-signup&checkout=${checkout.id}&status=pending`) as never);
}
