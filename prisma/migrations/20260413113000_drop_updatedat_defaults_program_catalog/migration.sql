DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'AcademicProgram'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'AcademicProgram' AND column_name = 'updatedAt'
  ) THEN
    ALTER TABLE "AcademicProgram" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'CourseCatalog'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'CourseCatalog' AND column_name = 'updatedAt'
  ) THEN
    ALTER TABLE "CourseCatalog" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;
END $$;
