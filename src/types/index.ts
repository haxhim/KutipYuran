import { MemberRole, PaymentProvider } from "@prisma/client";

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  isPlatformAdmin: boolean;
  memberships: Array<{
    organizationId: string;
    role: MemberRole;
  }>;
};

export type AuthPayload = {
  sessionId: string;
  userId: string;
};

export type PaymentLinkResult = {
  provider: PaymentProvider;
  checkoutUrl: string;
  providerReference: string;
  rawResponse?: unknown;
};

export type WebhookProcessResult = {
  success: boolean;
  status: "paid" | "pending" | "failed";
  providerReference?: string;
  eventId?: string;
  signatureValid?: boolean;
  raw?: unknown;
};
