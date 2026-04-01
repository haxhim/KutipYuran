import { SiteHeader } from "@/components/layout/site-header";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { AcceptInviteConsole } from "@/app/accept-invite/accept-invite-console";
import { verifyInviteToken } from "@/modules/invitations/invitation.service";

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token || "";

  let inviteEmail = "";
  let inviteError = "";

  try {
    inviteEmail = verifyInviteToken(token).email;
  } catch {
    inviteError = "This invite link is invalid or expired.";
  }

  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-xl px-6 py-16">
        <Card>
          <CardTitle>Accept Team Invite</CardTitle>
          <CardDescription className="mt-2">
            {inviteError || `Complete your password setup for ${inviteEmail}.`}
          </CardDescription>
          {!inviteError ? <AcceptInviteConsole inviteEmail={inviteEmail} token={token} /> : null}
        </Card>
      </main>
    </div>
  );
}
