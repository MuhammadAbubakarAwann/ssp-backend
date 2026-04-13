-- Alter TeacherClass to store selected program and course display fields.
-- Guarded for shadow DBs where earlier migrations may not have introduced
-- all referenced tables/columns yet.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'TeacherClass'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'TeacherClass' AND column_name = 'programName'
    ) THEN
      ALTER TABLE "TeacherClass" ADD COLUMN "programName" TEXT;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'TeacherClass' AND column_name = 'courseCode'
    ) THEN
      ALTER TABLE "TeacherClass" ADD COLUMN "courseCode" TEXT;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'TeacherClass' AND column_name = 'courseName'
    ) THEN
      ALTER TABLE "TeacherClass" ADD COLUMN "courseName" TEXT;
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'TeacherClass' AND column_name = 'programCode'
    ) THEN
      ALTER TABLE "TeacherClass" ALTER COLUMN "programCode" TYPE TEXT USING "programCode"::text;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'TeacherClass'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'AcademicProgram'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'TeacherClass' AND column_name = 'programCode'
  ) THEN
    UPDATE "TeacherClass" tc
    SET
      "programName" = ap."name",
      "name" = COALESCE(ap."name", tc."name")
    FROM "AcademicProgram" ap
    WHERE ap."code" = tc."programCode";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'TeacherClass'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'CourseCatalog'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'TeacherClass' AND column_name = 'courseCatalogId'
  ) THEN
    UPDATE "TeacherClass" tc
    SET
      "courseCode" = cc."courseCode",
      "courseName" = cc."courseTitle",
      "subject" = cc."courseCode" || ' ' || cc."courseTitle"
    FROM "CourseCatalog" cc
    WHERE tc."courseCatalogId" = cc."id";
  END IF;
END $$;
