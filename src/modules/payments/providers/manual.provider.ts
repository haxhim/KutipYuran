import { PaymentProvider } from "@prisma/client";
import type { PaymentProviderAdapter } from "@/modules/payments/payment-provider";

export class ManualPaymentProvider implements PaymentProviderAdapter {
  provider = PaymentProvider.MANUAL as const;

  async createPaymentLink({ organization, billingRecord }) {
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

  async handleWebhook() {
    return { success: true, status: "pending" as const };
  }

  async getTransactionStatus() {
    return { success: true, status: "pending" as const };
  }
}

