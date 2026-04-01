import Link from "next/link";
import { getCheckoutStatus } from "@/modules/saas/saas.service";

export const dynamic = "force-dynamic";

export default async function PaymentReturnPage({ searchParams }: { searchParams: Promise<{ status?: string; billing?: string; kind?: string; checkout?: string }> }) {
  const params = await searchParams;
  const checkout = params.checkout ? await getCheckoutStatus(params.checkout) : null;
  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-3xl font-bold">Payment Return</h1>
      <p className="mt-4 text-muted-foreground">Status: {params.status || "pending"}</p>
      {params.kind === "saas-signup" ? (
        <>
          <p className="text-muted-foreground">Checkout ID: {params.checkout || "-"}</p>
          <p className="mt-2 text-muted-foreground">Plan: {checkout?.saasPlan.name || "-"}</p>
          <p className="mt-2 text-muted-foreground">
            {checkout?.status === "PAID"
              ? "Payment received. Your tenant account is now active and you can log in."
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
