import bcrypt from "bcryptjs";
import { PrismaClient, BillingRecordStatus, BillingType, MemberRole, PaymentMode, PaymentProvider, PaymentTransactionStatus, ReminderCampaignStatus, ReminderRecipientStatus, SubscriptionStatus, UserStatus, WalletLedgerType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("Password123!", 10);

  const permissions = [
    ["manage_customers", "Manage customers"],
    ["manage_billing", "Manage billing"],
    ["create_campaigns", "Create campaigns"],
    ["manage_integrations", "Manage integrations"],
    ["view_reports", "View reports"],
    ["manage_team", "Manage team"],
    ["verify_manual_payments", "Verify manual payments"],
    ["manage_organization_settings", "Manage organization settings"],
    ["manage_pricing_and_limits", "Manage pricing and limits"],
    ["manage_wallet", "Manage wallet and payouts"],
  ];

  for (const [key, label] of permissions) {
    await prisma.permission.upsert({
      where: { key },
      update: { label },
      create: { key, label },
    });
  }

  const starter = await prisma.saaSPlan.upsert({
    where: { key: "starter" },
    update: {},
    create: {
      key: "starter",
      name: "Starter",
      priceMonthly: 79,
      priceAmount: 79,
      billingInterval: "MONTHLY",
      durationDays: 30,
      maxCustomers: 500,
      maxImportedCustomers: 500,
      maxMonthlyCampaigns: 10,
      maxMessagesPerPeriod: 2000,
      maxActiveWhatsapp: 1,
      maxWhatsappSessions: 1,
      maxPaymentRecordsMonth: 2000,
      teamMembers: 2,
      analyticsLevel: "basic",
      manualPaymentEnabled: true,
      chipEnabled: false,
      toyyibpayEnabled: true,
    },
  });

  const organization = await prisma.organization.upsert({
    where: { slug: "demo-tuition-centre" },
    update: {},
    create: {
      slug: "demo-tuition-centre",
      name: "Demo Tuition Centre",
      contactPerson: "Aina Binti Hassan",
      supportPhone: "0123456789",
      supportWhatsapp: "60123456789",
      senderDisplayName: "Admin KutipYuran",
      messageSignature: "Terima kasih.",
      paymentMode: PaymentMode.HYBRID,
      wallet: {
        create: {
          availableBalance: 250.00,
          pendingBalance: 100.00,
          totalEarned: 350.00,
          totalWithdrawn: 0.00,
        },
      },
    },
  });

  const owner = await prisma.user.upsert({
    where: { email: "owner@kutipyuran.demo" },
    update: {},
    create: {
      email: "owner@kutipyuran.demo",
      passwordHash: hashedPassword,
      fullName: "Demo Owner",
      phoneNumber: "60111111111",
      status: UserStatus.ACTIVE,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@kutipyuran.local" },
    update: {},
    create: {
      email: "admin@kutipyuran.local",
      passwordHash: hashedPassword,
      fullName: "Platform Admin",
      phoneNumber: "60122222222",
      status: UserStatus.ACTIVE,
      isPlatformAdmin: true,
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: owner.id,
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      userId: owner.id,
      role: MemberRole.USER,
      joinedAt: new Date(),
    },
  });

  await prisma.organizationSubscription.create({
    data: {
      organizationId: organization.id,
      saasPlanId: starter.id,
      status: SubscriptionStatus.ACTIVE,
      billingInterval: "MONTHLY",
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      amount: 79,
      currency: "MYR",
    },
  }).catch(() => null);

  const monthlyPlan = await prisma.feePlan.upsert({
    where: {
      organizationId_name: {
        organizationId: organization.id,
        name: "Monthly Fee",
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      name: "Monthly Fee",
      amount: 100,
      billingType: BillingType.RECURRING_MONTHLY,
      dueDayOfMonth: 5,
      notes: "Tuition monthly fee",
    },
  });

  const examPlan = await prisma.feePlan.upsert({
    where: {
      organizationId_name: {
        organizationId: organization.id,
        name: "Exam Fee",
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      name: "Exam Fee",
      amount: 30,
      billingType: BillingType.ONE_TIME,
    },
  });

  const customer = await prisma.customer.upsert({
    where: {
      organizationId_normalizedWhatsapp: {
        organizationId: organization.id,
        normalizedWhatsapp: "60129259193",
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      fullName: "Ali Bin Ahmad",
      firstName: "Ali",
      phoneNumber: "0129259193",
      normalizedWhatsapp: "60129259193",
      email: "ali.parent@example.com",
    },
  });

  await prisma.customerPlanAssignment.createMany({
    data: [
      { organizationId: organization.id, customerId: customer.id, feePlanId: monthlyPlan.id, quantity: 1 },
      { organizationId: organization.id, customerId: customer.id, feePlanId: examPlan.id, quantity: 1 },
    ],
    skipDuplicates: true,
  });

  const billing = await prisma.billingRecord.create({
    data: {
      organizationId: organization.id,
      customerId: customer.id,
      referenceNo: "KY-INV-1001",
      status: BillingRecordStatus.PENDING,
      dueDate: new Date(),
      subtotalAmount: 130,
      totalAmount: 130,
      paymentMode: PaymentMode.HYBRID,
      preferredProvider: PaymentProvider.TOYYIBPAY,
      items: {
        create: [
          {
            organizationId: organization.id,
            feePlanId: monthlyPlan.id,
            title: "Monthly Fee",
            quantity: 1,
            unitAmount: 100,
            totalAmount: 100,
          },
          {
            organizationId: organization.id,
            feePlanId: examPlan.id,
            title: "Exam Fee",
            quantity: 1,
            unitAmount: 30,
            totalAmount: 30,
          },
        ],
      },
    },
  });

  const transaction = await prisma.paymentTransaction.create({
    data: {
      organizationId: organization.id,
      billingRecordId: billing.id,
      provider: PaymentProvider.TOYYIBPAY,
      status: PaymentTransactionStatus.PENDING,
      amount: 130,
      checkoutUrl: "https://payment.kutipyuran.local/demo-checkout",
    },
  });

  await prisma.walletLedgerEntry.createMany({
    data: [
      {
        organizationId: organization.id,
        paymentTransactionId: transaction.id,
        type: WalletLedgerType.PAYMENT_PENDING,
        amount: 130,
        balanceDeltaPending: 130,
        referenceId: billing.id,
        externalProvider: PaymentProvider.TOYYIBPAY,
      },
      {
        organizationId: organization.id,
        type: WalletLedgerType.MANUAL_ADJUSTMENT,
        amount: 250,
        balanceDeltaAvailable: 250,
        note: "Seed opening balance",
      },
    ],
  });

  const template = await prisma.messageTemplate.create({
    data: {
      organizationId: organization.id,
      name: "Friendly Reminder",
      body: "Hi {{name}}, saya {{sender_name}} dari {{organization_name}} ingin mengingatkan anda tentang pembayaran sebanyak {{amount_due}}. Anda boleh buat pembayaran di link ini ya: {{payment_link}}. Terima kasih.",
      language: "ms",
      isDefault: true,
    },
  }).catch(async () =>
    prisma.messageTemplate.findFirstOrThrow({
      where: { organizationId: organization.id, name: "Friendly Reminder" },
    }),
  );

  const campaign = await prisma.reminderCampaign.create({
    data: {
      organizationId: organization.id,
      name: "April Reminder Batch",
      status: ReminderCampaignStatus.DRAFT,
      messageTemplateId: template.id,
      totalRecipients: 1,
    },
  }).catch(async () =>
    prisma.reminderCampaign.findFirstOrThrow({
      where: { organizationId: organization.id, name: "April Reminder Batch" },
    }),
  );

  await prisma.reminderCampaignRecipient.create({
    data: {
      organizationId: organization.id,
      reminderCampaignId: campaign.id,
      customerId: customer.id,
      billingRecordId: billing.id,
      status: ReminderRecipientStatus.QUEUED,
      dedupeKey: `${campaign.id}:${customer.id}:${billing.id}`,
    },
  }).catch(() => null);

  console.log("Seeded demo data");
  console.log("Owner login: owner@kutipyuran.demo / Password123!");
  console.log("Admin login: admin@kutipyuran.local / Password123!");
  void admin;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
