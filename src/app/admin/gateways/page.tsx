import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { IntegrationConsole } from "@/app/app/integrations/integration-console";
import { listGlobalProviderConfigs } from "@/modules/integrations/integration.service";

export default async function AdminGatewaysPage() {
  const globalProviderConfigs = await listGlobalProviderConfigs();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gateway Configuration</h1>
        <p className="text-muted-foreground">Platform-owned gateway credentials for the aggregator collection and payout model.</p>
      </div>

      <Card>
        <CardTitle>Collection Providers</CardTitle>
        <CardDescription className="mt-2">
          Configure CHIP and ToyyibPay at the SaaS level. Tenants only inherit collection availability and request payout later.
        </CardDescription>
        <div className="mt-4">
          <IntegrationConsole
            initialConfigs={globalProviderConfigs.map((config) => ({
              id: config.id,
              provider: config.provider,
              isEnabled: config.isEnabled,
              isGlobal: config.isGlobal,
              updatedAt: config.updatedAt,
              decryptedConfig: config.decryptedConfig,
            }))}
            providers={["CHIP", "TOYYIBPAY"]}
            savePath="/api/admin/integrations"
            testPath="/api/admin/integrations/test"
          />
        </div>
      </Card>
    </div>
  );
}
