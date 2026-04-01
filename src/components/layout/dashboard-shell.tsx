import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

const nav = [
  ["Dashboard", "/app"],
  ["Organization Settings", "/app/settings"],
  ["Subscription & Billing", "/app/subscription"],
  ["WhatsApp Connection", "/app/whatsapp"],
  ["Plans & Pricing", "/app/plans"],
  ["Customers / Payers", "/app/customers"],
  ["Imports", "/app/imports"],
  ["Billings / Invoices", "/app/billings"],
  ["Campaigns", "/app/campaigns"],
  ["Payment Records", "/app/payments"],
  ["Reports / Analytics", "/app/reports"],
  ["Integrations", "/app/integrations"],
  ["Team / Members", "/app/team"],
  ["Audit Logs", "/app/audit-logs"],
  ["Profile Settings", "/app/profile"],
];

export async function DashboardShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-background">
      <div className="grid min-h-screen md:grid-cols-[260px_1fr]">
        <aside className="border-r bg-card px-4 py-6">
          <div className="mb-8 px-2">
            <p className="text-sm text-muted-foreground">Signed in as</p>
            <p className="font-semibold">{user?.fullName || "Guest"}</p>
          </div>
          <nav className="space-y-1">
            {nav.map(([label, href]) => (
              <Link key={href} href={href} className="block rounded-xl px-3 py-2 text-sm hover:bg-muted">
                {label}
              </Link>
            ))}
            {user?.isPlatformAdmin ? (
              <Link href="/admin" className="block rounded-xl px-3 py-2 text-sm hover:bg-muted">
                Superadmin
              </Link>
            ) : null}
          </nav>
        </aside>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}

