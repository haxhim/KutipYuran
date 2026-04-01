import { PaymentProvider } from "@prisma/client";
import { env } from "@/lib/env";
import type { PaymentProviderAdapter } from "@/modules/payments/payment-provider";

export class ChipPaymentProvider implements PaymentProviderAdapter {
  provider = PaymentProvider.CHIP as const;

  async createPaymentLink({ organization, billingRecord, transaction }) {
    const payload = {
      brand_id: env.CHIP_BRAND_ID,
      client: {
        email: billingRecord.referenceNo.toLowerCase() + "@payer.local",
      },
      purchase: {
        products: [
          {
            name: `KutipYuran ${organization.name} ${billingRecord.referenceNo}`,
            price: Number(billingRecord.totalAmount),
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

    const raw = await response.json();

    if (!response.ok) {
      throw new Error(raw?.message || "Failed to create CHIP purchase");
    }

    return {
      provider: PaymentProvider.CHIP,
      checkoutUrl: raw.checkout_url,
      providerReference: raw.id,
      rawResponse: raw,
    };
  }

  async verifyPayment({ providerReference }) {
    if (!providerReference) {
      return { success: false, status: "failed" };
    }

    const response = await fetch(`${env.CHIP_API_BASE_URL}/purchases/${providerReference}`, {
      headers: {
        Authorization: `Bearer ${env.CHIP_API_TOKEN}`,
      },
    });
    const raw = await response.json();

    if (!response.ok) {
      return { success: false, status: "failed", raw };
    }

    const status = raw.paid ? "paid" : raw.status === "pending" ? "pending" : "failed";
    return { success: true, status, providerReference, raw };
  }

  async handleWebhook({ payload }) {
    const body = payload as Record<string, unknown>;
    const purchase = body?.purchase as Record<string, unknown> | undefined;
    return {
      success: true,
      status: purchase?.paid ? "paid" : "pending",
      providerReference: String(purchase?.id || ""),
      raw: payload,
    };
  }

  async getTransactionStatus({ transaction }) {
    return this.verifyPayment({ providerReference: transaction.providerReference || undefined, transaction });
  }
}

