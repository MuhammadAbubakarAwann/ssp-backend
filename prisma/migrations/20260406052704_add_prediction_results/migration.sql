-- CreateEnum
CREATE TYPE "PredictionScope" AS ENUM ('CLASS', 'SELECTED');

-- CreateEnum
CREATE TYPE "PerformanceLevel" AS ENUM ('LOW', 'AVG', 'HIGH');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MID', 'HIGH');

-- CreateTable
CREATE TABLE "PredictionRun" (
    "id" SERIAL NOT NULL,
    "classId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "scope" "PredictionScope" NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PredictionRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PredictionEntry" (
    "id" SERIAL NOT NULL,
    "predictionRunId" INTEGER NOT NULL,
    "studentRecordId" INTEGER,
    "studentName" TEXT NOT NULL,
    "regNo" TEXT NOT NULL,
    "predictedScore" DOUBLE PRECISION NOT NULL,
    "performance" "PerformanceLevel" NOT NULL,
    "passProbability" DOUBLE PRECISION NOT NULL,
    "modelConfidence" DOUBLE PRECISION NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "suggestions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PredictionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PredictionRun_classId_idx" ON "PredictionRun"("classId");

-- CreateIndex
CREATE INDEX "PredictionEntry_predictionRunId_idx" ON "PredictionEntry"("predictionRunId");

-- CreateIndex
CREATE INDEX "PredictionEntry_studentRecordId_idx" ON "PredictionEntry"("studentRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "PredictionEntry_predictionRunId_regNo_key" ON "PredictionEntry"("predictionRunId", "regNo");

-- AddForeignKey
ALTER TABLE "PredictionRun" ADD CONSTRAINT "PredictionRun_classId_fkey" FOREIGN KEY ("classId") REFERENCES "TeacherClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictionEntry" ADD CONSTRAINT "PredictionEntry_predictionRunId_fkey" FOREIGN KEY ("predictionRunId") REFERENCES "PredictionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictionEntry" ADD CONSTRAINT "PredictionEntry_studentRecordId_fkey" FOREIGN KEY ("studentRecordId") REFERENCES "StudentRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
