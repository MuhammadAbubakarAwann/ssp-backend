-- Add persisted semester analytics for each student record.
ALTER TABLE "StudentRecord"
ADD COLUMN "expectedCgpa" DOUBLE PRECISION,
ADD COLUMN "overallRiskLevel" "RiskLevel",
ADD COLUMN "classRank" INTEGER,
ADD COLUMN "semesterAvgScore" DOUBLE PRECISION;
