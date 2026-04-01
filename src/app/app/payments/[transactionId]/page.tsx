import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { hasPermission } from "@/lib/rbac";
import { formatCurrency } from "@/lib/utils";
import { permissions } from "@/modules/authz/permissions";
import { getPaymentTransactionDetail } from "@/modules/payments/payment-ops.service";
import { requireTenantPermission } from "@/modules/tenant/tenant-context";
import { PaymentDetailConsole } from "@/app/app/payments/payment-detail-console";

export default async function PaymentTransactionDetailPage({
  params,
}: {
  params: Promise<{ transactionId: string }>;
}) {
  const tenant = await requireTenantPermission(permissions.manageBilling);
  const { transactionId } = await params;
  const transaction = await getPaymentTransactionDetail(tenant.organizationId, transactionId);
  const canVerifyManualProofs =
    tenant.user.isPlatformAdmin || (tenant.role ? hasPermission(tenant.role, permissions.verifyManualPayments) : false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payment Transaction Detail</h1>
        <p className="text-muted-foreground">
          {transaction.provider} payment for {transaction.billingRecord.referenceNo}
        </p>
      </div>

      <Card className="space-y-4">
        <div>
          <CardTitle>Transaction Overview</CardTitle>
          <CardDescription className="mt-2">Provider status, payment references, and manual operator actions.</CardDescription>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 text-sm">
          <div className="rounded-xl bg-muted p-4">
            <p className="text-muted-foreground">Status</p>
            <p className="font-semibold">{transaction.status}</p>
          </div>
          <div className="rounded-xl bg-muted p-4">
            <p className="text-muted-foreground">Amount</p>
            <p className="font-semibold">{formatCurrency(transaction.amount.toString(), transaction.currency)}</p>
          </div>
          <div className="rounded-xl bg-muted p-4">
            <p className="text-muted-foreground">Provider Reference</p>
            <p className="font-semibold">{transaction.providerReference || "-"}</p>
          </div>
          <div className="rounded-xl bg-muted p-4">
            <p className="text-muted-foreground">Paid At</p>
            <p className="font-semibold">{transaction.paidAt ? new Date(transaction.paidAt).toLocaleString() : "-"}</p>
          </div>
        </div>
        <PaymentDetailConsole
          canVerifyManualProofs={canVerifyManualProofs}
          proofs={transaction.manualPaymentProofs.map((proof) => ({
            id: proof.id,
            verifiedAt: proof.verifiedAt?.toISOString() || null,
            downloadUrl: `/api/payments/proofs/${proof.id}/download`,
            note: proof.note || null,
          }))}
          transactionId={transaction.id}
        />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Billing Linkage</CardTitle>
          <div className="mt-4 space-y-2 text-sm">
            <p>Billing reference: {transaction.billingRecord.referenceNo}</p>
            <p>Customer: {transaction.billingRecord.customer.fullName}</p>
            <p>Billing status: {transaction.billingRecord.status}</p>
            <p>Due date: {new Date(transaction.billingRecord.dueDate).toLocaleDateString()}</p>
            <p>Checkout URL: {transaction.checkoutUrl || "-"}</p>
          </div>
        </Card>
        <Card>
          <CardTitle>Ledger Timeline</CardTitle>
          <div className="mt-4 space-y-3 text-sm">
            {transaction.ledgerEntries.length ? (
              transaction.ledgerEntries.map((entry) => (
                <div key={entry.id} className="rounded-xl bg-muted p-3">
                  <p className="font-medium">{entry.type}</p>
                  <p>{formatCurrency(entry.amount.toString(), entry.currency)}</p>
                  <p className="text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No ledger entries for this transaction.</p>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle>Manual Payment Proofs</CardTitle>
        <div className="mt-4 space-y-3">
          {transaction.manualPaymentProofs.length ? (
            transaction.manualPaymentProofs.map((proof) => (
              <div key={proof.id} className="rounded-xl bg-muted p-4 text-sm">
                <p className="font-medium">{proof.originalFileName}</p>
                <p>Uploaded: {new Date(proof.uploadedAt).toLocaleString()}</p>
                <p>MIME: {proof.mimeType}</p>
                <p>File size: {proof.fileSize} bytes</p>
                <p>
                  Download:{" "}
                  <a className="text-primary" href={`/api/payments/proofs/${proof.id}/download`}>
                    {proof.originalFileName}
                  </a>
                </p>
                <p>Verification: {proof.verifiedAt ? `Verified at ${new Date(proof.verifiedAt).toLocaleString()}` : "Pending review"}</p>
                <p>Note: {proof.note || "-"}</p>
              </div>
            ))
          ) : (
            <div className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
              No manual payment proofs have been uploaded for this transaction yet.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
