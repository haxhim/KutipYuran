import { notFound } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { ManualProofUpload } from "@/app/pay/manual/[billingId]/manual-proof-upload";

export default async function ManualPaymentPage({ params }: { params: Promise<{ billingId: string }> }) {
  const { billingId } = await params;
  const billing = await db.billingRecord.findUnique({
    where: { id: billingId },
    include: { customer: true, organization: true },
  });

  if (!billing) notFound();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Card>
        <CardTitle>Manual Payment Instructions</CardTitle>
        <div className="mt-4 space-y-2 text-sm">
          <p>Organization: {billing.organization.name}</p>
          <p>Reference: {billing.referenceNo}</p>
          <p>Amount: {formatCurrency(billing.totalAmount.toString())}</p>
          <p>Upload your bank transfer or QR payment proof below. Staff will review and verify it in the payment record screen.</p>
          <ManualProofUpload billingId={billing.id} />
        </div>
      </Card>
    </main>
  );
}
