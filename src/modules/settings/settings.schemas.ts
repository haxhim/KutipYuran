import { BillingType, MemberRole, PaymentProvider } from "@prisma/client";
import { z } from "zod";

export const organizationSettingsSchema = z.object({
  name: z.string().min(2),
  contactPerson: z.string().min(2),
  supportPhone: z.string().optional().or(z.literal("")),
  supportWhatsapp: z.string().optional().or(z.literal("")),
  senderDisplayName: z.string().min(2),
  messageSignature: z.string().optional().or(z.literal("")),
});

export const payoutRequestSchema = z.object({
  amount: z.coerce.number().positive(),
  bankName: z.string().min(2),
  accountName: z.string().min(2),
  accountNumber: z.string().min(4),
});

export const teamInviteSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2),
  phoneNumber: z.string().optional().or(z.literal("")),
  role: z.nativeEnum(MemberRole),
});

export const inviteAcceptanceSchema = z.object({
  token: z.string().min(10),
  fullName: z.string().min(2),
  password: z.string().min(8),
});

export const feePlanSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().or(z.literal("")),
  amount: z.coerce.number().positive(),
  billingType: z.nativeEnum(BillingType),
  dueDayOfMonth: z.coerce.number().int().min(1).max(31).optional(),
  dueIntervalDays: z.coerce.number().int().min(1).optional(),
  notes: z.string().optional().or(z.literal("")),
  active: z.boolean().optional(),
}).superRefine((value, ctx) => {
  if (value.billingType === BillingType.RECURRING_MONTHLY && !value.dueDayOfMonth) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Monthly recurring plans require a due day of month.",
      path: ["dueDayOfMonth"],
    });
  }

  if (value.billingType === BillingType.RECURRING_CUSTOM && !value.dueIntervalDays) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Custom recurring plans require a due interval in days.",
      path: ["dueIntervalDays"],
    });
  }
});

export const providerConfigSchema = z.object({
  provider: z.nativeEnum(PaymentProvider),
  isEnabled: z.boolean(),
  config: z.record(z.string(), z.string()),
}).superRefine((value, ctx) => {
  if (!value.isEnabled) {
    return;
  }

  const requiredKeysByProvider: Record<PaymentProvider, string[]> = {
    [PaymentProvider.CHIP]: ["CHIP_BRAND_ID", "CHIP_API_TOKEN"],
    [PaymentProvider.TOYYIBPAY]: ["TOYYIBPAY_CATEGORY_CODE", "TOYYIBPAY_SECRET_KEY"],
    [PaymentProvider.MANUAL]: ["BANK_NAME", "ACCOUNT_NAME", "ACCOUNT_NUMBER"],
  };

  for (const key of requiredKeysByProvider[value.provider]) {
    if (!value.config[key]?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${key} is required for ${value.provider}.`,
        path: ["config", key],
      });
    }
  }
});
