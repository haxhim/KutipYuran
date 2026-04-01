import { registerAction } from "@/app/register/actions";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-xl px-6 py-16">
        <Card>
          <CardTitle>Create Organization</CardTitle>
          <form action={registerAction} className="mt-6 grid gap-4">
            <Input name="organizationName" placeholder="Organization name" required />
            <Input name="contactPerson" placeholder="Contact person" required />
            <Input name="fullName" placeholder="Your full name" required />
            <Input name="email" type="email" placeholder="Email" required />
            <Input name="password" type="password" placeholder="Password" required />
            <Button type="submit">Create account</Button>
          </form>
        </Card>
      </main>
    </div>
  );
}

