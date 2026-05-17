-- Add a stable public identifier to existing CourseCatalog rows before enforcing constraints.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE "CourseCatalog"
ADD COLUMN IF NOT EXISTS "publicId" TEXT;

UPDATE "CourseCatalog"
SET "publicId" = CONCAT('c', REPLACE(gen_random_uuid()::text, '-', ''))
WHERE "publicId" IS NULL;

ALTER TABLE "CourseCatalog"
ALTER COLUMN "publicId" SET NOT NULL;

ALTER TABLE "CourseCatalog"
ALTER COLUMN "publicId" SET DEFAULT CONCAT('c', REPLACE(gen_random_uuid()::text, '-', ''));

CREATE UNIQUE INDEX IF NOT EXISTS "CourseCatalog_publicId_key"
ON "CourseCatalog"("publicId");