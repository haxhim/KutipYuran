import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function AuthenticatedShell({
  children,
  userName,
  userEmail,
  roleLabel,
  nav,
  footerLink,
}: {
  children: React.ReactNode;
  userName: string;
  userEmail?: string;
  roleLabel: string;
  nav: Array<{ label: string; href: string }>;
  footerLink?: { label: string; href: string };
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="grid min-h-screen md:grid-cols-[280px_1fr]">
        <aside className="border-r bg-card px-5 py-6">
          <div className="rounded-2xl border bg-background px-4 py-4 shadow-sm">
            <p className="text-sm text-muted-foreground">Signed in as</p>
            <p className="mt-1 font-semibold">{userName}</p>
            {userEmail ? <p className="mt-1 break-all text-xs text-muted-foreground">{userEmail}</p> : null}
            <Badge className="mt-3">{roleLabel}</Badge>
          </div>

          <nav className="mt-6 space-y-1">
            {nav.map((item) => (
              <a
                className={cn("block rounded-xl px-3 py-2 text-sm transition-colors hover:bg-muted")}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </a>
            ))}
            {footerLink ? (
              <a className="mt-3 block rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" href={footerLink.href}>
                {footerLink.label}
              </a>
            ) : null}
          </nav>

          <div className="mt-8">
            <SignOutButton className="w-full" variant="outline">
              Log out
            </SignOutButton>
          </div>
        </aside>

        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
