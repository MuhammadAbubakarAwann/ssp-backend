-- AlterTable
ALTER TABLE "PredictionEntry" ALTER COLUMN "publicId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PredictionRun" ALTER COLUMN "publicId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "StudentRecord" ALTER COLUMN "publicId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TeacherClass" ALTER COLUMN "publicId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "publicId" DROP DEFAULT;
