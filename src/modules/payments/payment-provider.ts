import { PaymentProvider } from "@prisma/client";
import type { BillingRecord, Organization, PaymentTransaction } from "@prisma/client";
import type { PaymentLinkResult, WebhookProcessResult } from "@/types";

export interface PaymentProviderAdapter {
  provider: PaymentProvider;
  createPaymentLink(args: {
    organization: Organization;
    billingRecord: BillingRecord;
    transaction: PaymentTransaction;
  }): Promise<PaymentLinkResult>;
  verifyPayment(args: {
    providerReference?: string;
    transaction: PaymentTransaction;
  }): Promise<WebhookProcessResult>;
  handleWebhook(args: {
    headers: Headers;
    payload: unknown;
  }): Promise<WebhookProcessResult>;
  getTransactionStatus(args: {
    transaction: PaymentTransaction;
  }): Promise<WebhookProcessResult>;
}

