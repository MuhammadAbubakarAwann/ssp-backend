-- CreateTable
CREATE TABLE "TeacherClass" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "section" TEXT,
    "semester" TEXT,
    "teacherId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentRecord" (
    "id" SERIAL NOT NULL,
    "classId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "regNo" TEXT NOT NULL,
    "quiz1" DOUBLE PRECISION,
    "quiz2" DOUBLE PRECISION,
    "quiz3" DOUBLE PRECISION,
    "quiz4" DOUBLE PRECISION,
    "quiz5" DOUBLE PRECISION,
    "quiz6" DOUBLE PRECISION,
    "assignment1" DOUBLE PRECISION,
    "assignment2" DOUBLE PRECISION,
    "assignment3" DOUBLE PRECISION,
    "assignment4" DOUBLE PRECISION,
    "assignment5" DOUBLE PRECISION,
    "midsPercentage" DOUBLE PRECISION,
    "attendancePercentage" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeacherClass_teacherId_idx" ON "TeacherClass"("teacherId");

-- CreateIndex
CREATE INDEX "StudentRecord_classId_idx" ON "StudentRecord"("classId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentRecord_classId_regNo_key" ON "StudentRecord"("classId", "regNo");

-- AddForeignKey
ALTER TABLE "TeacherClass" ADD CONSTRAINT "TeacherClass_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentRecord" ADD CONSTRAINT "StudentRecord_classId_fkey" FOREIGN KEY ("classId") REFERENCES "TeacherClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
