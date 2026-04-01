import { PaymentProvider } from "@prisma/client";
import type { PaymentProviderAdapter } from "@/modules/payments/payment-provider";

export class ManualPaymentProvider implements PaymentProviderAdapter {
  provider = PaymentProvider.MANUAL;

  async createPaymentLink({ organization, billingRecord }: Parameters<PaymentProviderAdapter["createPaymentLink"]>[0]) {
    return {
      provider: PaymentProvider.MANUAL,
      checkoutUrl: `${process.env.APP_URL}/pay/manual/${billingRecord.id}`,
      providerReference: `manual-${billingRecord.referenceNo}`,
      rawResponse: {
        organizationName: organization.name,
      },
    };
  }

  async verifyPayment() {
    return { success: true, status: "pending" as const };
  }

  async handleWebhook(_: Parameters<PaymentProviderAdapter["handleWebhook"]>[0]) {
    return { success: true, status: "pending" as const };
  }

  async getTransactionStatus(_: Parameters<PaymentProviderAdapter["getTransactionStatus"]>[0]) {
    return { success: true, status: "pending" as const };
  }
}
