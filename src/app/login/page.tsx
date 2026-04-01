import { loginAction } from "@/app/login/actions";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-md px-6 py-16">
        <Card>
          <CardTitle>Login</CardTitle>
          <form action={loginAction} className="mt-6 space-y-4">
            <Input name="email" type="email" placeholder="Email" required />
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

