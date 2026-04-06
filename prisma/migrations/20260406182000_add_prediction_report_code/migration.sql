-- Add stable human-readable report code for new prediction runs
ALTER TABLE "PredictionRun" ADD COLUMN IF NOT EXISTS "reportCode" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "PredictionRun_reportCode_key" ON "PredictionRun"("reportCode");