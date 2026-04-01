import { PaymentProvider } from "@prisma/client";
import { ChipPaymentProvider } from "@/modules/payments/providers/chip.provider";
import { ManualPaymentProvider } from "@/modules/payments/providers/manual.provider";
import { ToyyibPayPaymentProvider } from "@/modules/payments/providers/toyyibpay.provider";

const providers = {
  [PaymentProvider.CHIP]: new ChipPaymentProvider(),
  [PaymentProvider.TOYYIBPAY]: new ToyyibPayPaymentProvider(),
  [PaymentProvider.MANUAL]: new ManualPaymentProvider(),
};

export function getPaymentProvider(provider: PaymentProvider) {
  return providers[provider];
}

