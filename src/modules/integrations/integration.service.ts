import { PaymentProvider } from "@prisma/client";
import { decrypt, encrypt } from "@/lib/crypto";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { createAuditLog } from "@/modules/audit/audit.service";
import { parseGatewayJsonResponse, readGatewayErrorMessage } from "@/modules/payments/gateway-http";
import { gatewayToggleSchema, providerConfigSchema } from "@/modules/settings/settings.schemas";

export type ProviderConfigScope = "ORGANIZATION" | "GLOBAL";

export async function listProviderConfigs(organizationId: string) {
  const configs = await db.paymentProviderConfig.findMany({
    where: {
      OR: [
        { organizationId },
        { organizationId: null, isGlobal: true },
      ],
    },
    orderBy: [{ isGlobal: "desc" }, { provider: "asc" }],
  });

  return configs.map((config) => ({
    ...config,
    decryptedConfig: (() => {
      try {
        return JSON.parse(decrypt(config.encryptedConfig)) as Record<string, string>;
      } catch {
        return {};
      }
    })(),
  }));
}

export async function listGlobalProviderConfigs() {
  const configs = await db.paymentProviderConfig.findMany({
    where: {
      organizationId: null,
      isGlobal: true,
    },
    orderBy: { provider: "asc" },
  });

  return configs.map((config) => ({
    ...config,
    decryptedConfig: (() => {
      try {
        return JSON.parse(decrypt(config.encryptedConfig)) as Record<string, string>;
      } catch {
        return {};
      }
    })(),
  }));
}

export function getEnvGatewayHealth() {
  return [
    {
      provider: PaymentProvider.CHIP,
      configured: Boolean(env.CHIP_BRAND_ID && env.CHIP_API_TOKEN),
      baseUrl: env.CHIP_API_BASE_URL,
      missingKeys: [
        !env.CHIP_BRAND_ID ? "CHIP_BRAND_ID" : null,
        !env.CHIP_API_TOKEN ? "CHIP_API_TOKEN" : null,
      ].filter(Boolean) as string[],
    },
    {
      provider: PaymentProvider.TOYYIBPAY,
      configured: Boolean(env.TOYYIBPAY_CATEGORY_CODE && env.TOYYIBPAY_SECRET_KEY),
      baseUrl: env.TOYYIBPAY_API_BASE_URL,
      missingKeys: [
        !env.TOYYIBPAY_CATEGORY_CODE ? "TOYYIBPAY_CATEGORY_CODE" : null,
        !env.TOYYIBPAY_SECRET_KEY ? "TOYYIBPAY_SECRET_KEY" : null,
      ].filter(Boolean) as string[],
    },
  ];
}

export async function testEnvGatewayConnection(provider: PaymentProvider) {
  const health = getEnvGatewayHealth().find((item) => item.provider === provider);
  if (!health) {
    throw new Error("Unsupported provider");
  }

  if (!health.configured) {
    return {
      ok: false,
      message: `Missing env configuration: ${health.missingKeys.join(", ")}`,
    };
  }

  try {
    if (provider === PaymentProvider.CHIP) {
      const response = await fetch(`${env.CHIP_API_BASE_URL}/public_key/`, {
        headers: {
          Authorization: `Bearer ${env.CHIP_API_TOKEN}`,
        },
      });
      const raw = await parseGatewayJsonResponse(response, "CHIP returned an invalid response");

      return {
        ok: response.ok && typeof raw === "string" && raw.includes("BEGIN PUBLIC KEY"),
        message: response.ok
          ? "CHIP credentials are valid and the public key endpoint responded successfully."
          : readGatewayErrorMessage(raw, `CHIP endpoint responded with status ${response.status}.`),
      };
    }

    const response = await fetch(`${env.TOYYIBPAY_API_BASE_URL}/index.php/api/getCategoryDetails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        userSecretKey: env.TOYYIBPAY_SECRET_KEY,
        categoryCode: env.TOYYIBPAY_CATEGORY_CODE,
      }).toString(),
    });
    const raw = await parseGatewayJsonResponse(response, "ToyyibPay returned an invalid response");

    return {
      ok: response.ok && Array.isArray(raw) && raw.length > 0 && typeof raw[0]?.categoryName === "string",
      message:
        response.ok && Array.isArray(raw) && raw.length > 0 && typeof raw[0]?.categoryName === "string"
          ? "ToyyibPay credentials are valid and the category lookup succeeded."
          : readGatewayErrorMessage(raw, `ToyyibPay endpoint responded with status ${response.status}.`),
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : `Failed to reach ${provider} endpoint.`,
    };
  }
}

export async function listTenantGatewayStatuses(organizationId: string) {
  const [envGateways, tenantConfigs] = await Promise.all([
    Promise.resolve(getEnvGatewayHealth()),
    db.paymentProviderConfig.findMany({
      where: {
        organizationId,
        provider: {
          in: [PaymentProvider.CHIP, PaymentProvider.TOYYIBPAY],
        },
      },
      orderBy: { provider: "asc" },
    }),
  ]);

  return envGateways.map((gateway) => {
    const tenantConfig = tenantConfigs.find((config) => config.provider === gateway.provider);
    return {
      provider: gateway.provider,
      platformReady: gateway.configured,
      isEnabledForOrganization: tenantConfig?.isEnabled ?? false,
      updatedAt: tenantConfig?.updatedAt ?? null,
      baseUrl: gateway.baseUrl,
      missingKeys: gateway.missingKeys,
    };
  });
}

export async function updateTenantGatewayToggle(args: {
  organizationId: string;
  actorUserId: string;
  payload: unknown;
}) {
  const parsed = gatewayToggleSchema.parse(args.payload);
  const gatewayHealth = getEnvGatewayHealth().find((item) => item.provider === parsed.provider);

  if (parsed.isEnabled && !gatewayHealth?.configured) {
    throw new Error(`${parsed.provider} is not configured by platform admin yet.`);
  }

  const existing = await db.paymentProviderConfig.findFirst({
    where: {
      organizationId: args.organizationId,
      provider: parsed.provider,
    },
  });

  const config = existing
    ? await db.paymentProviderConfig.update({
        where: { id: existing.id },
        data: {
          isEnabled: parsed.isEnabled,
          encryptedConfig: existing.encryptedConfig || encrypt(JSON.stringify({})),
          isGlobal: false,
        },
      })
    : await db.paymentProviderConfig.create({
        data: {
          organizationId: args.organizationId,
          provider: parsed.provider,
          isEnabled: parsed.isEnabled,
          encryptedConfig: encrypt(JSON.stringify({})),
          isGlobal: false,
        },
      });

  await createAuditLog({
    organizationId: args.organizationId,
    userId: args.actorUserId,
    action: "gateway_provider.toggle_updated",
    entityType: "PaymentProviderConfig",
    entityId: config.id,
    metadata: {
      provider: parsed.provider,
      isEnabled: parsed.isEnabled,
    },
  });

  return config;
}

export async function ensureGatewayAvailableForOrganization(organizationId: string, provider: PaymentProvider) {
  if (provider === PaymentProvider.MANUAL) {
    return;
  }

  const gateway = (await listTenantGatewayStatuses(organizationId)).find((item) => item.provider === provider);

  if (!gateway?.platformReady) {
    throw new Error(`${provider} is not configured by platform admin.`);
  }

  if (!gateway.isEnabledForOrganization) {
    throw new Error(`${provider} is disabled for this organization.`);
  }
}

export async function upsertProviderConfig(args: {
  organizationId?: string;
  actorUserId: string;
  scope: ProviderConfigScope;
  payload: unknown;
}) {
  const parsed = providerConfigSchema.parse(args.payload);
  const isGlobal = args.scope === "GLOBAL";

  if (!isGlobal && parsed.provider !== PaymentProvider.MANUAL) {
    throw new Error("Tenants can only manage manual payment instructions. CHIP and ToyyibPay are managed by platform admin.");
  }

  if (isGlobal && parsed.provider === PaymentProvider.MANUAL) {
    throw new Error("Manual payment instructions must be managed by the tenant organization.");
  }

  const existing = await db.paymentProviderConfig.findFirst({
    where: isGlobal
      ? {
          organizationId: null,
          provider: parsed.provider,
          isGlobal: true,
        }
      : {
          organizationId: args.organizationId,
          provider: parsed.provider,
        },
  });

  const config = existing
    ? await db.paymentProviderConfig.update({
        where: { id: existing.id },
        data: {
          isEnabled: parsed.isEnabled,
          encryptedConfig: encrypt(JSON.stringify(parsed.config)),
          isGlobal,
          organizationId: isGlobal ? null : args.organizationId,
        },
      })
    : await db.paymentProviderConfig.create({
        data: {
          organizationId: isGlobal ? null : args.organizationId,
          provider: parsed.provider,
          isEnabled: parsed.isEnabled,
          encryptedConfig: encrypt(JSON.stringify(parsed.config)),
          isGlobal,
        },
      });

  await createAuditLog({
    organizationId: args.organizationId,
    userId: args.actorUserId,
    action: "payment_provider_config.updated",
    entityType: "PaymentProviderConfig",
    entityId: config.id,
    metadata: {
      provider: config.provider,
      isEnabled: config.isEnabled,
      scope: args.scope,
    },
  });

  return config;
}

export async function testProviderConfig(args: {
  organizationId?: string;
  provider: PaymentProvider;
  scope?: ProviderConfigScope;
}) {
  const config = await db.paymentProviderConfig.findFirst({
    where: {
      provider: args.provider,
      ...(args.scope === "GLOBAL"
        ? {
            organizationId: null,
            isGlobal: true,
          }
        : {
            OR: [
              { organizationId: args.organizationId },
              { organizationId: null, isGlobal: true },
            ],
          }),
    },
    orderBy: [{ organizationId: "desc" }, { isGlobal: "desc" }],
  });

  if (!config) {
    throw new Error("Provider config not found");
  }

  const decrypted = JSON.parse(decrypt(config.encryptedConfig)) as Record<string, string>;

  switch (args.provider) {
    case PaymentProvider.CHIP:
      return {
        ok: Boolean(decrypted.CHIP_BRAND_ID && decrypted.CHIP_API_TOKEN),
        message: decrypted.CHIP_BRAND_ID && decrypted.CHIP_API_TOKEN ? "CHIP configuration looks complete." : "Missing CHIP brand or API token.",
      };
    case PaymentProvider.TOYYIBPAY:
      return {
        ok: Boolean(decrypted.TOYYIBPAY_CATEGORY_CODE && decrypted.TOYYIBPAY_SECRET_KEY),
        message:
          decrypted.TOYYIBPAY_CATEGORY_CODE && decrypted.TOYYIBPAY_SECRET_KEY
            ? "ToyyibPay configuration looks complete."
            : "Missing ToyyibPay category code or secret key.",
      };
    case PaymentProvider.MANUAL:
      return {
        ok: true,
        message: "Manual payment configuration is always available when enabled.",
      };
    default:
      throw new Error("Unsupported provider");
  }
}
