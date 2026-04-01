import { PaymentProvider, SaaSBillingInterval, SaaSCheckoutStatus, SubscriptionStatus, UserStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { createAuditLog } from "@/modules/audit/audit.service";
import { createOrganizationSlug } from "@/lib/ids";
import { hashPassword } from "@/lib/auth";

function getPlanPrice(plan: { priceAmount: { toString(): string } | number; priceMonthly: { toString(): string } | number }) {
  const priceAmount = Number(typeof plan.priceAmount === "number" ? plan.priceAmount : plan.priceAmount.toString());
  if (priceAmount > 0) {
    return priceAmount;
  }

  return Number(typeof plan.priceMonthly === "number" ? plan.priceMonthly : plan.priceMonthly.toString());
}

function chooseSaaSCheckoutProvider() {
  if (env.TOYYIBPAY_CATEGORY_CODE && env.TOYYIBPAY_SECRET_KEY) {
    return PaymentProvider.TOYYIBPAY;
  }

  if (env.CHIP_BRAND_ID && env.CHIP_API_TOKEN) {
    return PaymentProvider.CHIP;
  }

  throw new Error("No SaaS payment gateway is configured in env.");
}

async function createSaaSPaymentLink(args: {
  checkoutId: string;
  provider: PaymentProvider;
  amount: number;
  planName: string;
  fullName: string;
  email: string;
}) {
  if (args.provider === PaymentProvider.TOYYIBPAY) {
    const formData = new URLSearchParams({
      userSecretKey: env.TOYYIBPAY_SECRET_KEY,
      categoryCode: env.TOYYIBPAY_CATEGORY_CODE,
      billName: `KutipYuran ${args.planName}`,
      billDescription: `SaaS subscription for ${args.planName}`,
      billPriceSetting: "1",
      billPayorInfo: "1",
      billAmount: String(Math.round(args.amount * 100)),
      billReturnUrl: `${env.APP_URL}/pay/return?kind=saas-signup&checkout=${args.checkoutId}&status=success`,
      billCallbackUrl: `${env.APP_URL}/api/webhooks/toyyibpay`,
      billExternalReferenceNo: args.checkoutId,
      billTo: args.fullName,
      billEmail: args.email,
      billPhone: "60111111111",
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
      throw new Error("Failed to create ToyyibPay SaaS checkout");
    }

    return {
      providerReference: billCode as string,
      checkoutUrl: `${env.TOYYIBPAY_API_BASE_URL}/${billCode}`,
    };
  }

  if (args.provider === PaymentProvider.CHIP) {
    const response = await fetch(`${env.CHIP_API_BASE_URL}/purchases/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.CHIP_API_TOKEN}`,
      },
      body: JSON.stringify({
        brand_id: env.CHIP_BRAND_ID,
        client: {
          email: args.email,
        },
        purchase: {
          products: [
            {
              name: `KutipYuran ${args.planName}`,
              price: args.amount,
            },
          ],
        },
        success_redirect: `${env.APP_URL}/pay/return?kind=saas-signup&checkout=${args.checkoutId}&status=success`,
        failure_redirect: `${env.APP_URL}/pay/return?kind=saas-signup&checkout=${args.checkoutId}&status=failure`,
        cancel_redirect: `${env.APP_URL}/pay/return?kind=saas-signup&checkout=${args.checkoutId}&status=cancelled`,
        platform: "web",
        reference: args.checkoutId,
      }),
    });
    const raw = await response.json();

    if (!response.ok || !raw?.id || !raw?.checkout_url) {
      throw new Error(raw?.message || "Failed to create CHIP SaaS checkout");
    }

    return {
      providerReference: raw.id as string,
      checkoutUrl: raw.checkout_url as string,
    };
  }

  throw new Error("Unsupported SaaS checkout provider");
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export async function listPublicPricingPlans() {
  return db.saaSPlan.findMany({
    where: { isActive: true },
    orderBy: [{ billingInterval: "asc" }, { priceAmount: "asc" }],
  });
}

export async function listAdminPricingPlans() {
  return db.saaSPlan.findMany({
    orderBy: [{ isActive: "desc" }, { billingInterval: "asc" }, { priceAmount: "asc" }],
  });
}

export async function upsertSaaSPlan(args: {
  actorUserId: string;
  planId?: string;
  payload: {
    key: string;
    name: string;
    billingInterval: SaaSBillingInterval;
    priceAmount: number;
    durationDays: number;
    maxWhatsappSessions: number;
    maxImportedCustomers: number;
    maxMessagesPerPeriod: number;
    isActive?: boolean;
  };
}) {
  const plan = args.planId
    ? await db.saaSPlan.update({
        where: { id: args.planId },
        data: {
          key: args.payload.key,
          name: args.payload.name,
          billingInterval: args.payload.billingInterval,
          priceAmount: args.payload.priceAmount,
          priceMonthly: args.payload.billingInterval === SaaSBillingInterval.MONTHLY ? args.payload.priceAmount : 0,
          durationDays: args.payload.durationDays,
          maxWhatsappSessions: args.payload.maxWhatsappSessions,
          maxActiveWhatsapp: args.payload.maxWhatsappSessions,
          maxImportedCustomers: args.payload.maxImportedCustomers,
          maxCustomers: args.payload.maxImportedCustomers,
          maxMessagesPerPeriod: args.payload.maxMessagesPerPeriod,
          isActive: args.payload.isActive ?? true,
        },
      })
    : await db.saaSPlan.create({
        data: {
          key: args.payload.key,
          name: args.payload.name,
          billingInterval: args.payload.billingInterval,
          priceAmount: args.payload.priceAmount,
          priceMonthly: args.payload.billingInterval === SaaSBillingInterval.MONTHLY ? args.payload.priceAmount : 0,
          durationDays: args.payload.durationDays,
          maxWhatsappSessions: args.payload.maxWhatsappSessions,
          maxActiveWhatsapp: args.payload.maxWhatsappSessions,
          maxImportedCustomers: args.payload.maxImportedCustomers,
          maxCustomers: args.payload.maxImportedCustomers,
          maxMessagesPerPeriod: args.payload.maxMessagesPerPeriod,
          maxMonthlyCampaigns: 999999,
          maxPaymentRecordsMonth: 999999,
          teamMembers: 999999,
          analyticsLevel: "standard",
          isActive: args.payload.isActive ?? true,
        },
      });

  await createAuditLog({
    userId: args.actorUserId,
    action: args.planId ? "saas_plan.updated" : "saas_plan.created",
    entityType: "SaaSPlan",
    entityId: plan.id,
    metadata: {
      key: plan.key,
      name: plan.name,
      billingInterval: plan.billingInterval,
      priceAmount: plan.priceAmount.toString(),
    },
  });

  return plan;
}

export async function setSaaSPlanActive(args: { actorUserId: string; planId: string; isActive: boolean }) {
  const plan = await db.saaSPlan.update({
    where: { id: args.planId },
    data: { isActive: args.isActive },
  });

  await createAuditLog({
    userId: args.actorUserId,
    action: args.isActive ? "saas_plan.activated" : "saas_plan.deactivated",
    entityType: "SaaSPlan",
    entityId: plan.id,
  });

  return plan;
}

export async function createRegistrationCheckout(input: {
  organizationName: string;
  contactPerson: string;
  fullName: string;
  email: string;
  password: string;
  planId: string;
}) {
  const existing = await db.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  if (existing) {
    throw new Error("An account with this email already exists.");
  }

  const plan = await db.saaSPlan.findFirstOrThrow({
    where: {
      id: input.planId,
      isActive: true,
    },
  });

  const provider = chooseSaaSCheckoutProvider();
  const amount = getPlanPrice(plan);
  const passwordHash = await hashPassword(input.password);

  const checkout = await db.saaSSubscriptionCheckout.create({
    data: {
      saasPlanId: plan.id,
      provider,
      billingInterval: plan.billingInterval,
      amount,
      registrationData: {
        organizationName: input.organizationName,
        contactPerson: input.contactPerson,
        fullName: input.fullName,
        email: input.email,
        passwordHash,
      },
    },
  });

  const paymentLink = await createSaaSPaymentLink({
    checkoutId: checkout.id,
    provider,
    amount,
    planName: plan.name,
    fullName: input.fullName,
    email: input.email,
  });

  return db.saaSSubscriptionCheckout.update({
    where: { id: checkout.id },
    data: {
      providerReference: paymentLink.providerReference,
      checkoutUrl: paymentLink.checkoutUrl,
    },
  });
}

export async function completeRegistrationCheckout(args: {
  provider: PaymentProvider;
  providerReference: string;
}) {
  const checkout = await db.saaSSubscriptionCheckout.findFirst({
    where: {
      provider: args.provider,
      providerReference: args.providerReference,
    },
    include: {
      saasPlan: true,
    },
  });

  if (!checkout) {
    return null;
  }

  if (checkout.status === SaaSCheckoutStatus.PAID) {
    return checkout;
  }

  const registrationData = checkout.registrationData as {
    organizationName: string;
    contactPerson: string;
    fullName: string;
    email: string;
    passwordHash: string;
  };

  const existing = await db.user.findUnique({
    where: { email: registrationData.email },
    select: { id: true },
  });

  if (existing) {
    await db.saaSSubscriptionCheckout.update({
      where: { id: checkout.id },
      data: {
        status: SaaSCheckoutStatus.FAILED,
      },
    });
    throw new Error("Email already exists for a paid registration.");
  }

  const startsAt = new Date();
  const endsAt = addDays(startsAt, checkout.saasPlan.durationDays);
  const slugBase = createOrganizationSlug(registrationData.organizationName);
  const slug = `${slugBase}-${Math.random().toString(36).slice(2, 6)}`;

  const result = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: registrationData.email,
        fullName: registrationData.fullName,
        passwordHash: registrationData.passwordHash,
        status: UserStatus.ACTIVE,
        memberships: {
          create: {
            role: "USER",
            joinedAt: new Date(),
            organization: {
              create: {
                slug,
                name: registrationData.organizationName,
                contactPerson: registrationData.contactPerson,
                senderDisplayName: registrationData.contactPerson,
                wallet: {
                  create: {},
                },
              },
            },
          },
        },
      },
      include: {
        memberships: true,
      },
    });

    const membership = user.memberships[0];
    await tx.organizationSubscription.create({
      data: {
        organizationId: membership.organizationId,
        saasPlanId: checkout.saasPlanId,
        status: SubscriptionStatus.ACTIVE,
        billingInterval: checkout.billingInterval,
        startsAt,
        endsAt,
        autoRenew: false,
        amount: checkout.amount,
        providerReference: checkout.providerReference,
      },
    });

    await tx.saaSSubscriptionCheckout.update({
      where: { id: checkout.id },
      data: {
        status: SaaSCheckoutStatus.PAID,
        paidAt: new Date(),
      },
    });

    return {
      user,
      organizationId: membership.organizationId,
    };
  });

  await createAuditLog({
    organizationId: result.organizationId,
    userId: result.user.id,
    action: "saas_subscription.activated",
    entityType: "OrganizationSubscription",
    metadata: {
      planName: checkout.saasPlan.name,
      billingInterval: checkout.billingInterval,
      provider: checkout.provider,
    },
  });

  return checkout;
}

export async function getCheckoutStatus(checkoutId: string) {
  return db.saaSSubscriptionCheckout.findUnique({
    where: { id: checkoutId },
    include: {
      saasPlan: true,
    },
  });
}

export async function getActiveOrganizationSubscription(organizationId: string) {
  const subscription = await db.organizationSubscription.findFirst({
    where: {
      organizationId,
      status: SubscriptionStatus.ACTIVE,
      OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
    include: { saasPlan: true },
  });

  return subscription;
}

export async function assertActiveSubscriptionAccess(organizationId: string) {
  const subscription = await getActiveOrganizationSubscription(organizationId);
  if (!subscription) {
    throw new Error("Your SaaS subscription is inactive. Please complete payment or contact admin.");
  }

  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: { suspendedAt: true },
  });

  if (organization?.suspendedAt) {
    throw new Error("This tenant account is suspended.");
  }

  return subscription;
}

export async function getOrganizationUsageSnapshot(organizationId: string) {
  const subscription = await getActiveOrganizationSubscription(organizationId);
  const periodStart = subscription?.startsAt || new Date(0);
  const periodEnd = subscription?.endsAt || new Date();

  const [customers, whatsappSessions, messagesSent] = await Promise.all([
    db.customer.count({
      where: {
        organizationId,
        deletedAt: null,
      },
    }),
    db.whatsAppSession.count({
      where: { organizationId },
    }),
    db.messageLog.count({
      where: {
        organizationId,
        direction: "OUTBOUND",
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
    }),
  ]);

  return {
    subscription,
    usage: {
      customers,
      whatsappSessions,
      messagesSent,
    },
  };
}

export async function assertCanCreateWhatsappSession(organizationId: string) {
  const snapshot = await getOrganizationUsageSnapshot(organizationId);
  if (!snapshot.subscription) {
    throw new Error("An active SaaS subscription is required.");
  }

  if (snapshot.usage.whatsappSessions >= snapshot.subscription.saasPlan.maxWhatsappSessions) {
    throw new Error("Your current plan has reached the WhatsApp session limit.");
  }
}

export async function assertCanImportCustomers(organizationId: string, importRows: number) {
  const snapshot = await getOrganizationUsageSnapshot(organizationId);
  if (!snapshot.subscription) {
    throw new Error("An active SaaS subscription is required.");
  }

  if (snapshot.usage.customers + importRows > snapshot.subscription.saasPlan.maxImportedCustomers) {
    throw new Error("This import exceeds your plan's customer database limit.");
  }
}

export async function assertCanSendMessages(organizationId: string, messageCount: number) {
  const snapshot = await getOrganizationUsageSnapshot(organizationId);
  if (!snapshot.subscription) {
    throw new Error("An active SaaS subscription is required.");
  }

  if (snapshot.usage.messagesSent + messageCount > snapshot.subscription.saasPlan.maxMessagesPerPeriod) {
    throw new Error("This action exceeds your plan's message sending limit.");
  }
}

export async function listTenantAccountsForAdmin() {
  const organizations = await db.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      members: {
        orderBy: { createdAt: "asc" },
        take: 1,
        include: {
          user: true,
        },
      },
      subscriptions: {
        include: { saasPlan: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: {
        select: {
          messageLogs: {
            where: {
              direction: "OUTBOUND",
            },
          },
        },
      },
    },
  });

  return organizations.map((organization) => ({
    organization,
    owner: organization.members[0]?.user || null,
    subscription: organization.subscriptions[0] || null,
    totalMessagesSent: organization._count.messageLogs,
  }));
}

export async function adminUpdateTenantAccount(args: {
  organizationId: string;
  actorUserId: string;
  planId?: string;
  durationDays?: number;
  suspended?: boolean;
}) {
  const organization = await db.organization.findUniqueOrThrow({
    where: { id: args.organizationId },
    include: {
      members: {
        include: { user: true },
      },
      subscriptions: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (typeof args.suspended === "boolean") {
    await db.organization.update({
      where: { id: organization.id },
      data: {
        suspendedAt: args.suspended ? new Date() : null,
      },
    });

    await Promise.all(
      organization.members.map((member) =>
        db.user.update({
          where: { id: member.userId },
          data: {
            status: args.suspended ? UserStatus.SUSPENDED : UserStatus.ACTIVE,
          },
        }),
      ),
    );
  }

  if (args.planId) {
    const plan = await db.saaSPlan.findUniqueOrThrow({
      where: { id: args.planId },
    });

    const startsAt = new Date();
    const endsAt = addDays(startsAt, args.durationDays || plan.durationDays);

    if (organization.subscriptions[0]) {
      await db.organizationSubscription.update({
        where: { id: organization.subscriptions[0].id },
        data: {
          saasPlanId: plan.id,
          billingInterval: plan.billingInterval,
          status: SubscriptionStatus.ACTIVE,
          startsAt,
          endsAt,
          amount: getPlanPrice(plan),
        },
      });
    } else {
      await db.organizationSubscription.create({
        data: {
          organizationId: organization.id,
          saasPlanId: plan.id,
          billingInterval: plan.billingInterval,
          status: SubscriptionStatus.ACTIVE,
          startsAt,
          endsAt,
          autoRenew: false,
          amount: getPlanPrice(plan),
        },
      });
    }
  }

  await createAuditLog({
    organizationId: organization.id,
    userId: args.actorUserId,
    action: "tenant_account.updated",
    entityType: "Organization",
    entityId: organization.id,
    metadata: {
      planId: args.planId,
      durationDays: args.durationDays,
      suspended: args.suspended,
    },
  });
}
