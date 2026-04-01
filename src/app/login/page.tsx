import { loginAction } from "@/app/login/actions";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getCurrentUser } from "@/lib/auth";
import { redirectIfSignedIn } from "@/lib/auth-redirects";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; email?: string }>;
}) {
  const user = await getCurrentUser();
  redirectIfSignedIn(user);

  const params = await searchParams;
  const email = params.email || "";
  const hasInvalidCredentials = params.error === "invalid_credentials";

  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-md px-6 py-16">
        <Card>
          <CardTitle>Login</CardTitle>
          <form action={loginAction} className="mt-6 space-y-4">
            {hasInvalidCredentials ? (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm">
                Invalid email or password.
              </div>
            ) : null}
            <Input name="email" type="email" placeholder="Email" required defaultValue={email} />
            <Input name="password" type="password" placeholder="Password" required />
            <Button className="w-full" type="submit">
              Sign in
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
