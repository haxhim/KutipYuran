import { PaymentProvider } from "@prisma/client";
import { env } from "@/lib/env";
import type { PaymentProviderAdapter } from "@/modules/payments/payment-provider";
import type { WebhookProcessResult } from "@/types";

export class ToyyibPayPaymentProvider implements PaymentProviderAdapter {
  provider = PaymentProvider.TOYYIBPAY;

  async createPaymentLink({ organization, billingRecord, transaction }: Parameters<PaymentProviderAdapter["createPaymentLink"]>[0]) {
    const formData = new URLSearchParams({
      userSecretKey: env.TOYYIBPAY_SECRET_KEY,
      categoryCode: env.TOYYIBPAY_CATEGORY_CODE,
      billName: `${organization.name} ${billingRecord.referenceNo}`,
      billDescription: `Bayaran ${billingRecord.referenceNo}`,
      billPriceSetting: "1",
      billPayorInfo: "1",
      billAmount: String(Number(billingRecord.totalAmount) * 100),
      billReturnUrl: `${env.APP_URL}/pay/return?status=success&billing=${billingRecord.id}`,
      billCallbackUrl: `${env.APP_URL}/api/webhooks/toyyibpay`,
      billExternalReferenceNo: transaction.id,
      billTo: organization.contactPerson,
      billEmail: `${billingRecord.referenceNo.toLowerCase()}@payer.local`,
      billPhone: organization.supportPhone || "60111111111",
    });

    const response = await fetch(`${env.TOYYIBPAY_API_BASE_URL}/index.php/api/createBill`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const raw = await response.json();
    const billCode = raw?.[0]?.BillCode;

    if (!response.ok || !billCode) {
      throw new Error("Failed to create ToyyibPay bill");
    }

    return {
      provider: PaymentProvider.TOYYIBPAY,
      checkoutUrl: `${env.TOYYIBPAY_API_BASE_URL}/${billCode}`,
      providerReference: billCode,
      rawResponse: raw,
    };
  }

  async verifyPayment({ providerReference }: Parameters<PaymentProviderAdapter["verifyPayment"]>[0]): Promise<WebhookProcessResult> {
    const status: WebhookProcessResult["status"] = providerReference ? "paid" : "failed";
    return {
      success: Boolean(providerReference),
      status,
      providerReference,
    };
  }

  async handleWebhook({ payload }: Parameters<PaymentProviderAdapter["handleWebhook"]>[0]): Promise<WebhookProcessResult> {
    const body = payload as Record<string, string>;
    const status: WebhookProcessResult["status"] = body.status_id === "1" ? "paid" : "failed";
    return {
      success: true,
      status,
      providerReference: body.billcode,
      raw: body,
    };
  }

  async getTransactionStatus({ transaction }: Parameters<PaymentProviderAdapter["getTransactionStatus"]>[0]) {
    return this.verifyPayment({ providerReference: transaction.providerReference || undefined, transaction });
  }
}
