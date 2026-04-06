-- Ensure pgcrypto is available for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add publicId to users
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "publicId" TEXT;

-- Backfill existing rows
UPDATE "User"
SET "publicId" = CONCAT('c', REPLACE(gen_random_uuid()::text, '-', ''))
WHERE "publicId" IS NULL;

-- Enforce constraints for future inserts
ALTER TABLE "User" ALTER COLUMN "publicId" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "publicId" SET DEFAULT CONCAT('c', REPLACE(gen_random_uuid()::text, '-', ''));

CREATE UNIQUE INDEX IF NOT EXISTS "User_publicId_key" ON "User"("publicId");