-- Add class metadata fields to PredictionRun so prediction runs can be tied to a specific program/semester/section/course.
ALTER TABLE "PredictionRun"
  ADD COLUMN IF NOT EXISTS "programCode" TEXT,
  ADD COLUMN IF NOT EXISTS "semesterNumber" INTEGER,
  ADD COLUMN IF NOT EXISTS "section" TEXT,
  ADD COLUMN IF NOT EXISTS "courseCode" TEXT,
  ADD COLUMN IF NOT EXISTS "courseName" TEXT;

CREATE INDEX IF NOT EXISTS "PredictionRun_programCode_semesterNumber_idx"
  ON "PredictionRun"("programCode", "semesterNumber");

CREATE INDEX IF NOT EXISTS "PredictionRun_courseCode_idx"
  ON "PredictionRun"("courseCode");
