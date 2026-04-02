SELECT pg_advisory_lock(918273645);

DO $$
BEGIN
  CREATE TYPE "SaaSBillingInterval" AS ENUM ('MONTHLY', 'YEARLY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "SaaSCheckoutStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "SaaSPlan"
ADD COLUMN IF NOT EXISTS "durationDays" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN IF NOT EXISTS "maxCustomers" INTEGER NOT NULL DEFAULT 500,
ADD COLUMN IF NOT EXISTS "maxImportedCustomers" INTEGER NOT NULL DEFAULT 500,
ADD COLUMN IF NOT EXISTS "maxMonthlyCampaigns" INTEGER NOT NULL DEFAULT 999999,
ADD COLUMN IF NOT EXISTS "maxMessagesPerPeriod" INTEGER NOT NULL DEFAULT 1000,
ADD COLUMN IF NOT EXISTS "maxActiveWhatsapp" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS "maxWhatsappSessions" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS "maxPaymentRecordsMonth" INTEGER NOT NULL DEFAULT 999999,
ADD COLUMN IF NOT EXISTS "teamMembers" INTEGER NOT NULL DEFAULT 999999,
ADD COLUMN IF NOT EXISTS "analyticsLevel" TEXT NOT NULL DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS "manualPaymentEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "chipEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "toyyibpayEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "customBrandingEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "prioritySupport" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "priceAmount" DECIMAL(12, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "billingInterval" "SaaSBillingInterval" NOT NULL DEFAULT 'MONTHLY';

UPDATE "SaaSPlan"
SET "priceAmount" = COALESCE("priceMonthly", 0)
WHERE "priceAmount" = 0;

UPDATE "SaaSPlan"
SET
  "maxImportedCustomers" = COALESCE("maxImportedCustomers", "maxCustomers", 500),
  "maxCustomers" = COALESCE("maxCustomers", "maxImportedCustomers", 500),
  "maxWhatsappSessions" = COALESCE("maxWhatsappSessions", "maxActiveWhatsapp", 1),
  "maxActiveWhatsapp" = COALESCE("maxActiveWhatsapp", "maxWhatsappSessions", 1);

ALTER TABLE "OrganizationSubscription"
ADD COLUMN IF NOT EXISTS "autoRenew" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "providerReference" TEXT,
ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'MYR',
ADD COLUMN IF NOT EXISTS "billingInterval" "SaaSBillingInterval" NOT NULL DEFAULT 'MONTHLY';

UPDATE "OrganizationSubscription" os
SET "billingInterval" = COALESCE(sp."billingInterval", 'MONTHLY')
FROM "SaaSPlan" sp
WHERE sp."id" = os."saasPlanId"
  AND os."billingInterval" = 'MONTHLY';

CREATE TABLE IF NOT EXISTS "SaaSSubscriptionCheckout" (
  "id" TEXT NOT NULL,
  "saasPlanId" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL,
  "status" "SaaSCheckoutStatus" NOT NULL DEFAULT 'PENDING',
  "billingInterval" "SaaSBillingInterval" NOT NULL DEFAULT 'MONTHLY',
  "amount" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'MYR',
  "providerReference" TEXT,
  "checkoutUrl" TEXT,
  "registrationData" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SaaSSubscriptionCheckout_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SaaSSubscriptionCheckout_saasPlanId_fkey"
    FOREIGN KEY ("saasPlanId") REFERENCES "SaaSPlan"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

ALTER TABLE "SaaSSubscriptionCheckout"
ADD COLUMN IF NOT EXISTS "billingInterval" "SaaSBillingInterval" NOT NULL DEFAULT 'MONTHLY',
ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'MYR';

CREATE UNIQUE INDEX IF NOT EXISTS "SaaSSubscriptionCheckout_providerReference_key"
ON "SaaSSubscriptionCheckout" ("providerReference");

CREATE INDEX IF NOT EXISTS "SaaSSubscriptionCheckout_status_createdAt_idx"
ON "SaaSSubscriptionCheckout" ("status", "createdAt");

SELECT pg_advisory_unlock(918273645);
