import { PaymentProvider } from "@prisma/client";
import { createVerify } from "node:crypto";
import { env } from "@/lib/env";
import { parseGatewayJsonResponse, readGatewayErrorMessage } from "@/modules/payments/gateway-http";
import type { PaymentProviderAdapter } from "@/modules/payments/payment-provider";
import type { WebhookProcessResult } from "@/types";

let chipPublicKeyCache: string | null = null;

async function getChipPublicKey() {
  if (env.CHIP_PUBLIC_KEY) {
    return env.CHIP_PUBLIC_KEY;
  }

  if (chipPublicKeyCache) {
    return chipPublicKeyCache;
  }

  const response = await fetch(`${env.CHIP_API_BASE_URL}/public_key/`, {
    headers: {
      Authorization: `Bearer ${env.CHIP_API_TOKEN}`,
    },
  });
  const raw = await parseGatewayJsonResponse(response, "Failed to retrieve CHIP public key");
  const publicKey = typeof raw === "string" ? raw : null;

  if (!response.ok || !publicKey) {
    throw new Error(readGatewayErrorMessage(raw, "Failed to retrieve CHIP public key"));
  }

  chipPublicKeyCache = publicKey;
  return publicKey;
}

async function verifyChipSignature(rawBody: string, signatureHeader: string | null) {
  if (!signatureHeader) {
    return false;
  }

  const publicKey = await getChipPublicKey();
  const verifier = createVerify("RSA-SHA256");
  verifier.update(rawBody);
  verifier.end();
  return verifier.verify(publicKey, signatureHeader, "base64");
}

export class ChipPaymentProvider implements PaymentProviderAdapter {
  provider = PaymentProvider.CHIP;

  async createPaymentLink({ organization, billingRecord, transaction }: Parameters<PaymentProviderAdapter["createPaymentLink"]>[0]) {
    const payload = {
      brand_id: env.CHIP_BRAND_ID,
      client: {
        email: billingRecord.referenceNo.toLowerCase() + "@payer.local",
      },
      purchase: {
        products: [
          {
            name: `KutipYuran ${organization.name} ${billingRecord.referenceNo}`,
            price: Math.round(Number(billingRecord.totalAmount) * 100),
          },
        ],
      },
      success_redirect: `${env.APP_URL}/pay/return?status=success&billing=${billingRecord.id}`,
      failure_redirect: `${env.APP_URL}/pay/return?status=failure&billing=${billingRecord.id}`,
      cancel_redirect: `${env.APP_URL}/pay/return?status=cancelled&billing=${billingRecord.id}`,
      platform: "web",
      reference: transaction.id,
    };

    const response = await fetch(`${env.CHIP_API_BASE_URL}/purchases/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.CHIP_API_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    const raw = await parseGatewayJsonResponse(response, "Payment gateway returned an invalid response");

    if (!response.ok) {
      throw new Error(readGatewayErrorMessage(raw, "Failed to create CHIP purchase"));
    }

    return {
      provider: PaymentProvider.CHIP,
      checkoutUrl: raw.checkout_url,
      providerReference: raw.id,
      rawResponse: raw,
    };
  }

  async verifyPayment({ providerReference }: Parameters<PaymentProviderAdapter["verifyPayment"]>[0]): Promise<WebhookProcessResult> {
    if (!providerReference) {
      return { success: false, status: "failed" };
    }

    const response = await fetch(`${env.CHIP_API_BASE_URL}/purchases/${providerReference}`, {
      headers: {
        Authorization: `Bearer ${env.CHIP_API_TOKEN}`,
      },
    });
    const raw = await parseGatewayJsonResponse(response, "Payment gateway returned an invalid response");

    if (!response.ok) {
      return { success: false, status: "failed", raw };
    }

    const status: WebhookProcessResult["status"] = raw.paid ? "paid" : raw.status === "pending" ? "pending" : "failed";
    return { success: true, status, providerReference, raw };
  }

  async handleWebhook({ headers, payload }: Parameters<PaymentProviderAdapter["handleWebhook"]>[0]): Promise<WebhookProcessResult> {
    const wrappedPayload = payload as { rawBody?: string; parsed?: Record<string, unknown> | null };
    const body = wrappedPayload?.parsed && typeof wrappedPayload.parsed === "object" ? wrappedPayload.parsed : (payload as Record<string, unknown>);
    const signatureValid = wrappedPayload?.rawBody ? await verifyChipSignature(wrappedPayload.rawBody, headers.get("x-signature")) : false;
    const purchase = body?.purchase as Record<string, unknown> | undefined;
    const status: WebhookProcessResult["status"] = purchase?.paid ? "paid" : "pending";
    return {
      success: signatureValid,
      status,
      providerReference: String(purchase?.id || ""),
      signatureValid,
      raw: payload,
    };
  }

  async getTransactionStatus({ transaction }: Parameters<PaymentProviderAdapter["getTransactionStatus"]>[0]) {
    return this.verifyPayment({ providerReference: transaction.providerReference || undefined, transaction });
  }
}
