import { Card, CardTitle } from "@/components/ui/card";
import { GatewayToggleConsole } from "@/app/app/integrations/gateway-toggle-console";
import { IntegrationConsole } from "@/app/app/integrations/integration-console";
import { permissions } from "@/modules/authz/permissions";
import { getOrganizationSettings } from "@/modules/settings/settings.service";
import { listProviderConfigs, listTenantGatewayStatuses } from "@/modules/integrations/integration.service";
import { requireTenantPermission } from "@/modules/tenant/tenant-context";

export default async function IntegrationsPage() {
  const tenant = await requireTenantPermission(permissions.manageIntegrations);
  const organization = await getOrganizationSettings(tenant.organizationId);
  const providerConfigs = await listProviderConfigs(tenant.organizationId);
  const gatewayStatuses = await listTenantGatewayStatuses(tenant.organizationId);

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
          <CardTitle>Gateway Collection</CardTitle>
          <div className="mt-4 space-y-4 text-sm">
            <div className="rounded-xl bg-muted p-4">
              <p className="font-medium">Aggregator model</p>
              <p className="mt-1 text-muted-foreground">
                CHIP and ToyyibPay are managed centrally by KutipYuran. Payers pay to the SaaS-controlled gateway first,
                then approved balances move back to your organization through payout requests.
              </p>
            </div>
            <GatewayToggleConsole
              gateways={gatewayStatuses.map((gateway) => ({
                provider: gateway.provider as "CHIP" | "TOYYIBPAY",
                platformReady: gateway.platformReady,
                isEnabledForOrganization: gateway.isEnabledForOrganization,
                updatedAt: gateway.updatedAt,
                baseUrl: gateway.baseUrl,
                missingKeys: gateway.missingKeys,
              }))}
            />
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle>Manual Payment Instructions</CardTitle>
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
            providers={["MANUAL"]}
          />
        </div>
      </Card>
    </div>
  );
}
