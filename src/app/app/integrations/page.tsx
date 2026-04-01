import { Card, CardTitle } from "@/components/ui/card";
import { IntegrationConsole } from "@/app/app/integrations/integration-console";
import { permissions } from "@/modules/authz/permissions";
import { getOrganizationSettings } from "@/modules/settings/settings.service";
import { listProviderConfigs } from "@/modules/integrations/integration.service";
import { requireTenantPermission } from "@/modules/tenant/tenant-context";

export default async function IntegrationsPage() {
  const tenant = await requireTenantPermission(permissions.manageIntegrations);
  const organization = await getOrganizationSettings(tenant.organizationId);
  const providerConfigs = await listProviderConfigs(tenant.organizationId);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Integrations</h1>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardTitle>WhatsApp Sessions</CardTitle>
          <div className="mt-4 space-y-3 text-sm">
            {organization.whatsappSessions.map((session) => (
              <div key={session.id} className="rounded-xl bg-muted p-4">
                <p className="font-medium">{session.label}</p>
                <p>Status: {session.status}</p>
                <p>Last active: {session.lastActiveAt ? new Date(session.lastActiveAt).toLocaleString() : "-"}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardTitle>Payment Provider Configurations</CardTitle>
          <div className="mt-4">
            <IntegrationConsole
              initialConfigs={providerConfigs.map((config) => ({
                id: config.id,
                provider: config.provider,
                isEnabled: config.isEnabled,
                isGlobal: config.isGlobal,
                updatedAt: config.updatedAt,
                decryptedConfig: config.decryptedConfig,
              }))}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
