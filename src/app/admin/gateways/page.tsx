import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { GatewayHealthConsole } from "@/app/admin/gateways/gateway-health-console";
import { getEnvGatewayHealth } from "@/modules/integrations/integration.service";

export default async function AdminGatewaysPage() {
  const envGateways = getEnvGatewayHealth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gateway Configuration</h1>
        <p className="text-muted-foreground">Read-only platform gateway health from env, plus live connectivity testing.</p>
      </div>

      <Card>
        <CardTitle>Collection Providers</CardTitle>
        <CardDescription className="mt-2">
          Gateway credentials live in env. Tenants can only enable or disable use of the platform-managed providers for their own organization.
        </CardDescription>
        <div className="mt-4 space-y-4">
          {envGateways.map((gateway) => (
            <div className="rounded-2xl border bg-card p-5 shadow-sm" key={gateway.provider}>
              <p className="text-lg font-semibold">{gateway.provider}</p>
              <p className="mt-1 text-sm text-muted-foreground">Endpoint: {gateway.baseUrl}</p>
              <p className="mt-2 text-sm">
                Env status: {gateway.configured ? "Configured" : `Missing ${gateway.missingKeys.join(", ")}`}
              </p>
            </div>
          ))}
          <GatewayHealthConsole providers={envGateways.map((gateway) => ({ provider: gateway.provider as "CHIP" | "TOYYIBPAY" }))} />
        </div>
      </Card>
    </div>
  );
}
