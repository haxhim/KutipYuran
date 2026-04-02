import Link from "next/link";
import { getCheckoutStatus, reconcileRegistrationCheckout } from "@/modules/saas/saas.service";

export const dynamic = "force-dynamic";

function getReturnStatus(params: { status?: string; status_id?: string }) {
  if (params.status) {
    return params.status;
  }

  if (params.status_id === "1") {
    return "success";
  }

  if (params.status_id === "2" || params.status_id === "4") {
    return "pending";
  }

  if (params.status_id === "3") {
    return "failure";
  }

  return "pending";
}

export default async function PaymentReturnPage({ searchParams }: { searchParams: Promise<{ status?: string; status_id?: string; billing?: string; kind?: string; checkout?: string; order_id?: string }> }) {
  const params = await searchParams;
  const status = getReturnStatus(params);
  const checkoutId = params.checkout || params.order_id;
  const checkout =
    params.kind === "saas-signup" && checkoutId && status === "success"
      ? await reconcileRegistrationCheckout(checkoutId)
      : checkoutId
        ? await getCheckoutStatus(checkoutId)
        : null;
  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-3xl font-bold">Payment Return</h1>
      <p className="mt-4 text-muted-foreground">Status: {status}</p>
      {params.kind === "saas-signup" ? (
        <>
          <p className="text-muted-foreground">Checkout ID: {checkoutId || "-"}</p>
          <p className="mt-2 text-muted-foreground">Plan: {checkout?.saasPlan.name || "-"}</p>
          <p className="mt-2 text-muted-foreground">
            {checkout?.status === "PAID"
              ? "Payment received. Your tenant account is now active and you can log in."
              : status === "failure"
                ? "Payment was not completed. Please try again."
                : "Payment is still pending confirmation. Please wait a moment and try logging in after payment completes."}
          </p>
          <Link className="mt-4 inline-block text-sm font-medium text-primary" href="/login">
            Go to login
          </Link>
        </>
      ) : (
        <p className="text-muted-foreground">Billing ID: {params.billing || "-"}</p>
      )}
    </main>
  );
}
