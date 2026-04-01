import { PaymentProvider } from "@prisma/client";
import { decrypt, encrypt } from "@/lib/crypto";
import { db } from "@/lib/db";
import { createAuditLog } from "@/modules/audit/audit.service";
import { providerConfigSchema } from "@/modules/settings/settings.schemas";

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
