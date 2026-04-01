import { PaymentProvider } from "@prisma/client";
import { decrypt, encrypt } from "@/lib/crypto";
import { db } from "@/lib/db";
import { createAuditLog } from "@/modules/audit/audit.service";
import { providerConfigSchema } from "@/modules/settings/settings.schemas";

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

export async function upsertProviderConfig(args: {
  organizationId: string;
  actorUserId: string;
  payload: unknown;
}) {
  const parsed = providerConfigSchema.parse(args.payload);

  const config = await db.paymentProviderConfig.upsert({
    where: {
      organizationId_provider: {
        organizationId: args.organizationId,
        provider: parsed.provider,
      },
    },
    update: {
      isEnabled: parsed.isEnabled,
      encryptedConfig: encrypt(JSON.stringify(parsed.config)),
      isGlobal: false,
    },
    create: {
      organizationId: args.organizationId,
      provider: parsed.provider,
      isEnabled: parsed.isEnabled,
      encryptedConfig: encrypt(JSON.stringify(parsed.config)),
      isGlobal: false,
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
    },
  });

  return config;
}

export async function testProviderConfig(args: {
  organizationId: string;
  provider: PaymentProvider;
}) {
  const config = await db.paymentProviderConfig.findFirst({
    where: {
      organizationId: args.organizationId,
      provider: args.provider,
    },
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
