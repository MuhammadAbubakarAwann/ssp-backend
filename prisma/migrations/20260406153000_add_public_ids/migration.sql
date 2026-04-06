-- Ensure pgcrypto is available for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add publicId columns
ALTER TABLE "TeacherClass" ADD COLUMN IF NOT EXISTS "publicId" TEXT;
ALTER TABLE "StudentRecord" ADD COLUMN IF NOT EXISTS "publicId" TEXT;
ALTER TABLE "PredictionRun" ADD COLUMN IF NOT EXISTS "publicId" TEXT;
ALTER TABLE "PredictionEntry" ADD COLUMN IF NOT EXISTS "publicId" TEXT;

-- Backfill existing rows with unique CUID-like identifiers
UPDATE "TeacherClass"
SET "publicId" = CONCAT('c', REPLACE(gen_random_uuid()::text, '-', ''))
WHERE "publicId" IS NULL;

UPDATE "StudentRecord"
SET "publicId" = CONCAT('c', REPLACE(gen_random_uuid()::text, '-', ''))
WHERE "publicId" IS NULL;

UPDATE "PredictionRun"
SET "publicId" = CONCAT('c', REPLACE(gen_random_uuid()::text, '-', ''))
WHERE "publicId" IS NULL;

UPDATE "PredictionEntry"
SET "publicId" = CONCAT('c', REPLACE(gen_random_uuid()::text, '-', ''))
WHERE "publicId" IS NULL;

-- Enforce not-null and defaults for future inserts
ALTER TABLE "TeacherClass" ALTER COLUMN "publicId" SET NOT NULL;
ALTER TABLE "TeacherClass" ALTER COLUMN "publicId" SET DEFAULT CONCAT('c', REPLACE(gen_random_uuid()::text, '-', ''));

ALTER TABLE "StudentRecord" ALTER COLUMN "publicId" SET NOT NULL;
ALTER TABLE "StudentRecord" ALTER COLUMN "publicId" SET DEFAULT CONCAT('c', REPLACE(gen_random_uuid()::text, '-', ''));

ALTER TABLE "PredictionRun" ALTER COLUMN "publicId" SET NOT NULL;
ALTER TABLE "PredictionRun" ALTER COLUMN "publicId" SET DEFAULT CONCAT('c', REPLACE(gen_random_uuid()::text, '-', ''));

ALTER TABLE "PredictionEntry" ALTER COLUMN "publicId" SET NOT NULL;
ALTER TABLE "PredictionEntry" ALTER COLUMN "publicId" SET DEFAULT CONCAT('c', REPLACE(gen_random_uuid()::text, '-', ''));

-- Unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS "TeacherClass_publicId_key" ON "TeacherClass"("publicId");
CREATE UNIQUE INDEX IF NOT EXISTS "StudentRecord_publicId_key" ON "StudentRecord"("publicId");
CREATE UNIQUE INDEX IF NOT EXISTS "PredictionRun_publicId_key" ON "PredictionRun"("publicId");
CREATE UNIQUE INDEX IF NOT EXISTS "PredictionEntry_publicId_key" ON "PredictionEntry"("publicId");