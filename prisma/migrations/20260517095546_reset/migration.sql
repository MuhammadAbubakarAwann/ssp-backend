/*
  Warnings:

  - The `programCode` column on the `TeacherClass` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'CourseCatalog' AND column_name = 'publicId'
  ) THEN
    ALTER TABLE "CourseCatalog" ALTER COLUMN "publicId" DROP DEFAULT;
  END IF;
END $$;

-- AlterTable
ALTER TABLE "PredictionRun" ADD COLUMN     "courseCode" TEXT,
ADD COLUMN     "courseName" TEXT,
ADD COLUMN     "programCode" TEXT,
ADD COLUMN     "section" TEXT,
ADD COLUMN     "semesterNumber" INTEGER;

-- AlterTable
ALTER TABLE "TeacherClass" DROP COLUMN "programCode",
ADD COLUMN     "programCode" TEXT;

-- CreateIndex
CREATE INDEX "PredictionRun_programCode_semesterNumber_idx" ON "PredictionRun"("programCode", "semesterNumber");

-- CreateIndex
CREATE INDEX "PredictionRun_courseCode_idx" ON "PredictionRun"("courseCode");

-- CreateIndex
CREATE INDEX "TeacherClass_programCode_semesterNumber_idx" ON "TeacherClass"("programCode", "semesterNumber");

-- CreateIndex
CREATE INDEX "TeacherClass_programCode_courseCode_idx" ON "TeacherClass"("programCode", "courseCode");