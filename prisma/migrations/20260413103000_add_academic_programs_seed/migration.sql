CREATE TABLE "AcademicProgram" (
  "id" SERIAL NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AcademicProgram_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AcademicProgram_code_key" ON "AcademicProgram"("code");
CREATE INDEX "AcademicProgram_isActive_idx" ON "AcademicProgram"("isActive");

INSERT INTO "AcademicProgram" ("code", "name") VALUES
('BSCS', 'Bachelor of Science in Computer Science'),
('BSSE', 'Bachelor of Science in Software Engineering'),
('BSIT', 'Bachelor of Science in Information Technology'),
('BSAI', 'Bachelor of Science in Artificial Intelligence'),
('BSCE', 'Bachelor of Science in Civil Engineering'),
('BSEE', 'Bachelor of Science in Electrical Engineering'),
('BSME', 'Bachelor of Science in Mechanical Engineering'),
('BSCHE', 'Bachelor of Science in Chemical Engineering'),
('BSDS', 'Bachelor of Science in Data Science'),
('BSCY', 'Bachelor of Science in Cyber Security'),
('BSMATH', 'Bachelor of Science in Mathematics'),
('BSPHY', 'Bachelor of Science in Physics'),
('BSCHEM', 'Bachelor of Science in Chemistry'),
('BSBIO', 'Bachelor of Science in Biology'),
('BBA', 'Bachelor of Business Administration'),
('BCOM', 'Bachelor of Commerce'),
('BACC', 'Bachelor of Accounting and Finance'),
('LLB', 'Bachelor of Laws'),
('DPT', 'Doctor of Physical Therapy'),
('BARCH', 'Bachelor of Architecture'),
('BSN', 'Bachelor of Science in Nursing'),
('BPHARM', 'Bachelor of Pharmacy'),
('BED', 'Bachelor of Education')
ON CONFLICT ("code") DO NOTHING;
