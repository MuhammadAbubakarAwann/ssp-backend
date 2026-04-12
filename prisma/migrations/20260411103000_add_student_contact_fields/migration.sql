-- Add optional student contact fields for details API.
ALTER TABLE "StudentRecord"
ADD COLUMN "email" TEXT,
ADD COLUMN "phoneNumber" TEXT,
ADD COLUMN "address" TEXT;
