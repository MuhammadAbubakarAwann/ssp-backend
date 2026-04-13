ALTER TABLE "CourseCatalog"
ADD COLUMN "publicId" TEXT;

UPDATE "CourseCatalog"
SET "publicId" = 'cc_' || SUBSTRING(md5("id"::text || clock_timestamp()::text || random()::text) FROM 1 FOR 24)
WHERE "publicId" IS NULL;

ALTER TABLE "CourseCatalog"
ALTER COLUMN "publicId" SET NOT NULL;

CREATE UNIQUE INDEX "CourseCatalog_publicId_key" ON "CourseCatalog"("publicId");
