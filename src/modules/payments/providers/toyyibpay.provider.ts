import { PaymentProvider } from "@prisma/client";
import { createHash } from "node:crypto";
import { env } from "@/lib/env";
import { parseGatewayJsonResponse, readGatewayErrorMessage } from "@/modules/payments/gateway-http";
import type { PaymentProviderAdapter } from "@/modules/payments/payment-provider";
import type { WebhookProcessResult } from "@/types";

function toyyibPayStatusFromPayload(body: Record<string, string>) {
  const code = body.status || body.status_id || "";
  if (code === "1") {
    return "paid" as const;
  }
  if (code === "2" || code === "4") {
    return "pending" as const;
  }
  return "failed" as const;
}

function verifyToyyibPayHash(body: Record<string, string>) {
  const expectedHash = createHash("md5")
    .update(`${env.TOYYIBPAY_SECRET_KEY}${body.status || ""}${body.order_id || ""}${body.refno || ""}ok`)
    .digest("hex");

  return Boolean(body.hash) && expectedHash === body.hash;
}

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
      billReturnUrl: `${env.APP_URL}/pay/return?billing=${billingRecord.id}`,
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

    const raw = await parseGatewayJsonResponse(response, "Payment gateway returned an invalid response");
    const billCode = raw?.[0]?.BillCode;

    if (!response.ok || !billCode) {
      throw new Error(readGatewayErrorMessage(raw, "Failed to create ToyyibPay bill"));
    }

    return {
      provider: PaymentProvider.TOYYIBPAY,
      checkoutUrl: `${env.TOYYIBPAY_API_BASE_URL}/${billCode}`,
      providerReference: billCode,
      rawResponse: raw,
    };
  }

  async verifyPayment({ providerReference }: Parameters<PaymentProviderAdapter["verifyPayment"]>[0]): Promise<WebhookProcessResult> {
    if (!providerReference) {
      return { success: false, status: "failed" };
    }

    const response = await fetch(`${env.TOYYIBPAY_API_BASE_URL}/index.php/api/getBillTransactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        billCode: providerReference,
      }).toString(),
    });

    const raw = await parseGatewayJsonResponse(response, "Payment gateway returned an invalid response");
    const latest = Array.isArray(raw) ? (raw[0] as Record<string, string> | undefined) : undefined;
    const code = latest?.billpaymentStatus || latest?.status || "";
    const status: WebhookProcessResult["status"] =
      code === "1" ? "paid" : code === "2" || code === "4" ? "pending" : "failed";

    return {
      success: response.ok,
      status,
      providerReference,
      raw,
    };
  }

  async handleWebhook({ payload }: Parameters<PaymentProviderAdapter["handleWebhook"]>[0]): Promise<WebhookProcessResult> {
    const wrappedPayload = payload as { parsed?: Record<string, string> | null };
    const body = wrappedPayload?.parsed && typeof wrappedPayload.parsed === "object" ? wrappedPayload.parsed : (payload as Record<string, string>);
    const signatureValid = verifyToyyibPayHash(body);
    const status: WebhookProcessResult["status"] = toyyibPayStatusFromPayload(body);
    return {
      success: signatureValid,
      status,
      providerReference: body.billcode,
      signatureValid,
      raw: body,
    };
  }

  async getTransactionStatus({ transaction }: Parameters<PaymentProviderAdapter["getTransactionStatus"]>[0]) {
    return this.verifyPayment({ providerReference: transaction.providerReference || undefined, transaction });
  }
}
