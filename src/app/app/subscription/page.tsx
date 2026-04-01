import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { permissions } from "@/modules/authz/permissions";
import { getOrganizationSettings } from "@/modules/settings/settings.service";
import { requireTenantPermission } from "@/modules/tenant/tenant-context";
import { PayoutConsole } from "@/app/app/subscription/payout-console";

export default async function SubscriptionPage() {
  const tenant = await requireTenantPermission(permissions.managePricingAndLimits);
  const organization = await getOrganizationSettings(tenant.organizationId);
  const currentSubscription = organization.subscriptions[0] || null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Subscription & Billing</h1>
        <p className="text-muted-foreground">Current SaaS plan, wallet status, and payout request workflow.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardTitle>Current Subscription</CardTitle>
          <div className="mt-4 space-y-2 text-sm">
            <p>Plan: {currentSubscription?.saasPlan.name || "-"}</p>
            <p>Status: {currentSubscription?.status || "-"}</p>
            <p>Amount: {currentSubscription ? formatCurrency(currentSubscription.amount.toString(), currentSubscription.currency) : "-"}</p>
            <p>Auto renew: {currentSubscription?.autoRenew ? "Enabled" : "Disabled"}</p>
            <p>Starts: {currentSubscription?.startsAt ? new Date(currentSubscription.startsAt).toLocaleDateString() : "-"}</p>
            <p>Ends: {currentSubscription?.endsAt ? new Date(currentSubscription.endsAt).toLocaleDateString() : "-"}</p>
          </div>
        </Card>

        <Card>
          <CardTitle>Wallet Snapshot</CardTitle>
          <div className="mt-4 space-y-2 text-sm">
            <p>Available balance: {formatCurrency(organization.wallet?.availableBalance.toString() || 0)}</p>
            <p>Pending balance: {formatCurrency(organization.wallet?.pendingBalance.toString() || 0)}</p>
            <p>Total earned: {formatCurrency(organization.wallet?.totalEarned.toString() || 0)}</p>
            <p>Total withdrawn: {formatCurrency(organization.wallet?.totalWithdrawn.toString() || 0)}</p>
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle>Request Payout</CardTitle>
        <CardDescription className="mt-2">Create reimbursement/disbursement requests from the tenant wallet balance.</CardDescription>
        <div className="mt-4">
          <PayoutConsole />
        </div>
      </Card>

      <Card>
        <CardTitle>Payout History</CardTitle>
        <div className="mt-4 space-y-3">
          {organization.payoutRequests.length ? (
            organization.payoutRequests.map((payout) => (
              <div key={payout.id} className="rounded-xl bg-muted p-4 text-sm">
                <p className="font-medium">{formatCurrency(payout.amount.toString())}</p>
                <p>Status: {payout.status}</p>
                <p>Bank: {payout.bankName}</p>
                <p>Requested: {new Date(payout.requestedAt).toLocaleString()}</p>
                <p>Admin note: {payout.adminNote || "-"}</p>
              </div>
            ))
          ) : (
            <div className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">No payout requests yet.</div>
          )}
        </div>
      </Card>
    </div>
  );
}
