DO $$
BEGIN
  CREATE TYPE "SaaSBillingInterval" AS ENUM ('MONTHLY', 'YEARLY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "SaaSPlan"
ADD COLUMN IF NOT EXISTS "priceAmount" DECIMAL(12, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "billingInterval" "SaaSBillingInterval" NOT NULL DEFAULT 'MONTHLY';

UPDATE "SaaSPlan"
SET "priceAmount" = COALESCE("priceMonthly", 0)
WHERE "priceAmount" = 0;

ALTER TABLE "OrganizationSubscription"
ADD COLUMN IF NOT EXISTS "billingInterval" "SaaSBillingInterval" NOT NULL DEFAULT 'MONTHLY';

UPDATE "OrganizationSubscription" os
SET "billingInterval" = COALESCE(sp."billingInterval", 'MONTHLY')
FROM "SaaSPlan" sp
WHERE sp."id" = os."saasPlanId"
  AND os."billingInterval" = 'MONTHLY';
