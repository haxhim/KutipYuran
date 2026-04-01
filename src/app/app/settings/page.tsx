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
        <h1 className="text-3xl font-bold">Organization Settings</h1>
        <p className="text-muted-foreground">Core tenant profile, support channels, and default sender identity.</p>
      </div>
      <Card>
        <CardTitle>Organization Profile</CardTitle>
        <CardDescription className="mt-2">Update the tenant-facing business identity used across billing and reminders.</CardDescription>
        <div className="mt-4">
          <SettingsConsole
            initialValues={{
              name: organization.name,
              contactPerson: organization.contactPerson,
              supportPhone: organization.supportPhone || "",
              supportWhatsapp: organization.supportWhatsapp || "",
              senderDisplayName: organization.senderDisplayName,
              messageSignature: organization.messageSignature || "",
            }}
          />
        </div>
      </Card>
    </div>
  );
}
