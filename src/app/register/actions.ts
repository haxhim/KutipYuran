"use server";

import { PaymentProvider } from "@prisma/client";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { getCurrentUser } from "@/lib/auth";
import { getSignedInHome } from "@/lib/auth-redirects";
import { createRegistrationCheckout } from "@/modules/saas/saas.service";

export async function registerAction(formData: FormData) {
  const existingUser = await getCurrentUser();
  if (existingUser) {
    redirect(getSignedInHome(existingUser));
  }

  try {
    const checkout = await createRegistrationCheckout({
      organizationName: String(formData.get("organizationName") || ""),
      contactPerson: String(formData.get("contactPerson") || ""),
      fullName: String(formData.get("fullName") || ""),
      email: String(formData.get("email") || ""),
      password: String(formData.get("password") || ""),
      planId: String(formData.get("planId") || ""),
      provider: String(formData.get("provider") || "") as PaymentProvider,
    });

    redirect((checkout.checkoutUrl || `/pay/return?kind=saas-signup&checkout=${checkout.id}&status=pending`) as never);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    const message = error instanceof Error ? error.message : "Registration failed";
    redirect(`/register?error=${encodeURIComponent(message)}` as never);
  }
}
