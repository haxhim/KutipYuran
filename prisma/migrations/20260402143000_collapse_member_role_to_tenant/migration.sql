ALTER TYPE "MemberRole" RENAME TO "MemberRole_old";

CREATE TYPE "MemberRole" AS ENUM ('TENANT');

ALTER TABLE "OrganizationMember"
ALTER COLUMN "role" TYPE "MemberRole"
USING (
  CASE
    WHEN "role"::text IN ('ADMIN', 'USER') THEN 'TENANT'
    ELSE NULL
  END
)::"MemberRole";

DROP TYPE "MemberRole_old";
