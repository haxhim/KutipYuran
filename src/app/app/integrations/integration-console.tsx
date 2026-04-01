"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ProviderKey = "CHIP" | "TOYYIBPAY" | "MANUAL";

type ProviderConfigItem = {
  id: string;
  provider: ProviderKey;
  isEnabled: boolean;
  isGlobal: boolean;
  updatedAt: string | Date;
  decryptedConfig: Record<string, string>;
};

const providerFields: Record<
  ProviderKey,
  Array<{ key: string; label: string; placeholder: string; sensitive?: boolean }>
> = {
  CHIP: [
    { key: "CHIP_BRAND_ID", label: "Brand ID", placeholder: "brand_xxx" },
    { key: "CHIP_API_TOKEN", label: "API Token", placeholder: "Paste CHIP API token", sensitive: true },
  ],
  TOYYIBPAY: [
    { key: "TOYYIBPAY_CATEGORY_CODE", label: "Category Code", placeholder: "cat_xxx" },
    { key: "TOYYIBPAY_SECRET_KEY", label: "Secret Key", placeholder: "Paste ToyyibPay secret key", sensitive: true },
  ],
  MANUAL: [
    { key: "BANK_NAME", label: "Bank Name", placeholder: "Maybank" },
    { key: "ACCOUNT_NAME", label: "Account Name", placeholder: "KutipYuran Sdn Bhd" },
    { key: "ACCOUNT_NUMBER", label: "Account Number", placeholder: "1234567890" },
    { key: "PAYMENT_INSTRUCTIONS", label: "Payment Instructions", placeholder: "Send receipt after transfer" },
  ],
};

export function IntegrationConsole({
  initialConfigs,
  providers = ["CHIP", "TOYYIBPAY", "MANUAL"],
  savePath = "/api/integrations",
  testPath = "/api/integrations/test",
}: {
  initialConfigs: ProviderConfigItem[];
  providers?: ProviderKey[];
  savePath?: string;
  testPath?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState("");
  const [testResults, setTestResults] = useState<Partial<Record<ProviderKey, string>>>({});
  const [form, setForm] = useState(() => {
    const configs = Object.fromEntries(
      providers.map((provider) => {
        const existing = initialConfigs.find((item) => item.provider === provider);
        return [
          provider,
          {
            isEnabled: existing?.isEnabled ?? false,
            config: Object.fromEntries(providerFields[provider].map((field) => [field.key, existing?.decryptedConfig?.[field.key] || ""])),
          },
        ];
      }),
    ) as Record<ProviderKey, { isEnabled: boolean; config: Record<string, string> }>;

    return configs;
  });

  const configMeta = useMemo(
    () =>
      Object.fromEntries(
        providers.map((provider) => [
          provider,
          initialConfigs.find((item) => item.provider === provider) || null,
        ]),
      ) as Record<ProviderKey, ProviderConfigItem | null>,
    [initialConfigs, providers],
  );

  async function saveProvider(provider: ProviderKey) {
    setStatusMessage("");
    const response = await fetch(savePath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        isEnabled: form[provider].isEnabled,
        config: form[provider].config,
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setStatusMessage(payload?.error || `Failed to save ${provider} configuration.`);
      return;
    }
    setStatusMessage(`${provider} configuration saved.`);
    startTransition(() => router.refresh());
  }

  async function testProvider(provider: ProviderKey) {
    setStatusMessage("");
    const response = await fetch(testPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setTestResults((current) => ({ ...current, [provider]: payload?.error || `Failed to test ${provider}.` }));
      return;
    }
    setTestResults((current) => ({ ...current, [provider]: payload?.message || `${provider} test completed.` }));
  }

  return (
    <div className="space-y-6">
      {providers.map((provider) => (
        <div className="rounded-2xl border bg-card p-5 shadow-sm" key={provider}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>{provider}</CardTitle>
              <CardDescription className="mt-1">
                Scope: {configMeta[provider]?.isGlobal ? "Global fallback" : "Organization override"}
              </CardDescription>
              <CardDescription>
                Last updated: {configMeta[provider]?.updatedAt ? new Date(configMeta[provider]?.updatedAt).toLocaleString() : "Not configured yet"}
              </CardDescription>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                checked={form[provider].isEnabled}
                className="h-4 w-4"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    [provider]: {
                      ...current[provider],
                      isEnabled: event.target.checked,
                    },
                  }))
                }
                type="checkbox"
              />
              Enabled
            </label>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {providerFields[provider].map((field) => (
              <div className={field.key === "PAYMENT_INSTRUCTIONS" ? "md:col-span-2" : ""} key={field.key}>
                <p className="mb-1 text-sm font-medium">{field.label}</p>
                {field.key === "PAYMENT_INSTRUCTIONS" ? (
                  <textarea
                    className="min-h-28 w-full rounded-xl border bg-background px-3 py-2 text-sm"
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        [provider]: {
                          ...current[provider],
                          config: {
                            ...current[provider].config,
                            [field.key]: event.target.value,
                          },
                        },
                      }))
                    }
                    placeholder={field.placeholder}
                    value={form[provider].config[field.key] || ""}
                  />
                ) : (
                  <Input
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        [provider]: {
                          ...current[provider],
                          config: {
                            ...current[provider].config,
                            [field.key]: event.target.value,
                          },
                        },
                      }))
                    }
                    placeholder={field.placeholder}
                    type={field.sensitive ? "password" : "text"}
                    value={form[provider].config[field.key] || ""}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Button disabled={isPending} onClick={() => saveProvider(provider)} type="button">
              Save {provider}
            </Button>
            <Button disabled={isPending} onClick={() => testProvider(provider)} type="button" variant="outline">
              Test {provider}
            </Button>
          </div>

          {testResults[provider] ? <div className="mt-3 rounded-xl border bg-muted px-4 py-3 text-sm">{testResults[provider]}</div> : null}
        </div>
      ))}

      {statusMessage ? <div className="rounded-xl border bg-card px-4 py-3 text-sm">{statusMessage}</div> : null}
    </div>
  );
}
