import { Card, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user?.isPlatformAdmin) {
    return <div>Forbidden</div>;
  }

  const [organizations, payouts, transactions] = await Promise.all([
    db.organization.findMany({ take: 10, orderBy: { createdAt: "desc" } }),
    db.payoutRequest.findMany({ take: 10, orderBy: { createdAt: "desc" } }),
    db.paymentTransaction.findMany({ take: 10, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Superadmin</h1>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardTitle>Organizations</CardTitle>
          <div className="mt-4 space-y-2 text-sm">
            {organizations.map((organization) => <p key={organization.id}>{organization.name}</p>)}
          </div>
        </Card>
        <Card>
          <CardTitle>Payout approvals</CardTitle>
          <div className="mt-4 space-y-2 text-sm">
            {payouts.map((payout) => <p key={payout.id}>{payout.status} {formatCurrency(payout.amount.toString())}</p>)}
          </div>
        </Card>
        <Card>
          <CardTitle>Incoming payments</CardTitle>
          <div className="mt-4 space-y-2 text-sm">
            {transactions.map((transaction) => <p key={transaction.id}>{transaction.provider} {transaction.status}</p>)}
          </div>
        </Card>
      </div>
    </div>
  );
}

