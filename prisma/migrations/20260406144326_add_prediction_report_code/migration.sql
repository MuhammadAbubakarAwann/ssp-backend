-- Make migration safe on fresh databases where publicId columns do not exist yet.
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = 'PredictionEntry' AND column_name = 'publicId'
	) THEN
		ALTER TABLE "PredictionEntry" ALTER COLUMN "publicId" DROP DEFAULT;
	END IF;

	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = 'PredictionRun' AND column_name = 'publicId'
	) THEN
		ALTER TABLE "PredictionRun" ALTER COLUMN "publicId" DROP DEFAULT;
	END IF;

	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = 'StudentRecord' AND column_name = 'publicId'
	) THEN
		ALTER TABLE "StudentRecord" ALTER COLUMN "publicId" DROP DEFAULT;
	END IF;

	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = 'TeacherClass' AND column_name = 'publicId'
	) THEN
		ALTER TABLE "TeacherClass" ALTER COLUMN "publicId" DROP DEFAULT;
	END IF;

	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'publicId'
	) THEN
		ALTER TABLE "User" ALTER COLUMN "publicId" DROP DEFAULT;
	END IF;
END
$$;
