import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { permissions } from "@/modules/authz/permissions";
import { getOrganizationSettings } from "@/modules/settings/settings.service";
import { requireTenantPermission } from "@/modules/tenant/tenant-context";
import { SettingsConsole } from "@/app/app/settings/settings-console";

export default async function SettingsPage() {
  const tenant = await requireTenantPermission(permissions.manageOrganizationSettings);
  const organization = await getOrganizationSettings(tenant.organizationId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Company and account information in one place.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardTitle>Company</CardTitle>
          <CardDescription className="mt-2">{organization.name}</CardDescription>
        </Card>
        <Card>
          <CardTitle>User</CardTitle>
          <CardDescription className="mt-2">{tenant.user.fullName}</CardDescription>
          <p className="mt-2 text-sm text-muted-foreground">{tenant.user.email}</p>
        </Card>
        <Card>
          <CardTitle>Contact</CardTitle>
          <CardDescription className="mt-2">{organization.contactPerson}</CardDescription>
          <p className="mt-2 text-sm text-muted-foreground">{organization.supportWhatsapp || organization.supportPhone || "-"}</p>
        </Card>
      </div>

      <Card>
        <CardTitle>Profile & Company</CardTitle>
        <CardDescription className="mt-2">Keep the main details for your company and account together in one simple form.</CardDescription>
        <div className="mt-4">
          <SettingsConsole
            initialValues={{
              companyName: organization.name,
              fullName: tenant.user.fullName,
              email: tenant.user.email,
              contactPerson: organization.contactPerson,
              supportPhone: organization.supportPhone || "",
              supportWhatsapp: organization.supportWhatsapp || "",
            }}
          />
        </div>
      </Card>
    </div>
  );
}
