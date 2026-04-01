import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { permissions } from "@/modules/authz/permissions";
import { requireTenantPermission } from "@/modules/tenant/tenant-context";
import { listTeamMembers } from "@/modules/team/team.service";

export default async function TeamPage() {
  const tenant = await requireTenantPermission(permissions.manageTeam);
  const members = await listTeamMembers(tenant.organizationId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Team / Members</h1>
        <p className="text-muted-foreground">Current organization access list with role visibility and membership state.</p>
      </div>

      <Card>
        <CardTitle>Members</CardTitle>
        <CardDescription className="mt-2">
          Invitation and removal actions are the next step, but the access register is now visible for admins.
        </CardDescription>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-3">Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-b">
                  <td className="py-3">
                    <div>
                      <p className="font-medium">{member.user.fullName}</p>
                      <p className="text-xs text-muted-foreground">{member.user.phoneNumber || "-"}</p>
                    </div>
                  </td>
                  <td>{member.user.email}</td>
                  <td>{member.role}</td>
                  <td>{member.user.status}</td>
                  <td>{member.joinedAt ? new Date(member.joinedAt).toLocaleString() : "Invited"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
