-- Add program-course catalog and attach teacher classes to selected program/semester/course.
CREATE TYPE "ProgramCode" AS ENUM ('BSCS', 'BSSE');

CREATE TABLE "CourseCatalog" (
  "id" SERIAL NOT NULL,
  "programCode" "ProgramCode" NOT NULL,
  "semesterNumber" INTEGER NOT NULL,
  "courseCode" TEXT NOT NULL,
  "courseTitle" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CourseCatalog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "TeacherClass"
ADD COLUMN "programCode" "ProgramCode",
ADD COLUMN "semesterNumber" INTEGER,
ADD COLUMN "courseCatalogId" INTEGER;

CREATE UNIQUE INDEX "CourseCatalog_programCode_semesterNumber_courseCode_key"
ON "CourseCatalog"("programCode", "semesterNumber", "courseCode");

CREATE INDEX "CourseCatalog_programCode_semesterNumber_idx"
ON "CourseCatalog"("programCode", "semesterNumber");

CREATE INDEX "TeacherClass_programCode_semesterNumber_idx"
ON "TeacherClass"("programCode", "semesterNumber");

CREATE INDEX "TeacherClass_courseCatalogId_idx"
ON "TeacherClass"("courseCatalogId");

ALTER TABLE "TeacherClass"
ADD CONSTRAINT "TeacherClass_courseCatalogId_fkey"
FOREIGN KEY ("courseCatalogId") REFERENCES "CourseCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "CourseCatalog" ("programCode", "semesterNumber", "courseCode", "courseTitle") VALUES
('BSCS', 1, 'CS-101', 'Introduction to Information and Communication Technology'),
('BSCS', 1, 'CS-102', 'Programming Fundamentals'),
('BSCS', 1, 'HS-101', 'English'),
('BSCS', 1, 'MT-101', 'Calculus & Analytical Geometry'),
('BSCS', 1, 'BS-105', 'Applied Physics'),
('BSCS', 1, 'HS-102', 'Pakistan Studies'),
('BSCS', 1, 'QT-101', 'Translation of the Quran: Beliefs'),
('BSCS', 2, 'CS-104', 'Object Oriented Programming'),
('BSCS', 2, 'HS-103', 'Communication Skills'),
('BSCS', 2, 'CS-103', 'Discrete Structures'),
('BSCS', 2, 'IS-211', 'Islamic Studies'),
('BSCS', 2, 'CS-204', 'Software Engineering'),
('BSCS', 2, 'HS-403', 'Management and Entrepreneurship'),
('BSCS', 3, 'CS-201', 'Data Structures & Algorithms'),
('BSCS', 3, 'SE-201', 'Software Requirement Engineering'),
('BSCS', 3, 'CS-408', 'Human Computer Interaction'),
('BSCS', 3, 'MT-203', 'Linear Algebra'),
('BSCS', 3, 'HS-302', 'International Relations'),
('BSCS', 3, 'QT-201', 'Translation of the Quran: Worships'),
('BSCS', 4, 'CS-303', 'Operating Systems'),
('BSCS', 4, 'CS-304', 'Database Systems'),
('BSCS', 4, 'SE-202', 'Software Design & Architecture'),
('BSCS', 4, 'MT-302', 'Probability and Statistics'),
('BSCS', 4, 'CS-302', 'Artificial Intelligence'),
('BSCS', 5, 'SE-305', 'Software Construction and Development'),
('BSCS', 5, 'CS-306', 'Data Communication and Computer Networks'),
('BSCS', 5, 'HS-201', 'Technical Report Writing'),
('BSCS', 5, 'SE-301', 'Business Process Engineering'),
('BSCS', 5, 'CS-313', 'Formal Methods in Software Engineering'),
('BSCS', 5, 'QT-301', 'Translation of the Quran: Moral Values'),
('BSCS', 6, 'CS-402', 'Information Security'),
('BSCS', 6, 'HS-401', 'Professional Values and Ethics'),
('BSCS', 6, 'CS-312', 'Web Engineering'),
('BSCS', 6, 'SE-306', 'Software Quality Engineering'),
('BSCS', 6, 'CS-403', 'Mobile Application Development'),
('BSCS', 6, 'SE-303', 'Simulation and Modeling'),
('BSCS', 7, 'CS-416', 'Natural Language Processing'),
('BSCS', 7, 'ME-407', 'Health Safety and Environment'),
('BSCS', 7, 'SE-404', 'Big Data Analytics'),
('BSCS', 7, 'SE-401', 'Software Project Management'),
('BSCS', 7, 'SE-402', 'Software Re-Engineering'),
('BSCS', 7, 'SE-499', 'Final Year Design Project - I'),
('BSCS', 7, 'QT-401', 'Translation of the Quran: Dealings and Commands'),
('BSCS', 7, 'HS-203', 'Community Service'),
('BSCS', 8, 'HS-402', 'Economics'),
('BSCS', 8, 'HS-404', 'Foreign Language'),
('BSCS', 8, 'SE-405', 'Cloud Computing'),
('BSCS', 8, 'SE-407', 'Global Software Development'),
('BSCS', 8, 'SE-499', 'Final Year Design Project - II');

INSERT INTO "CourseCatalog" ("programCode", "semesterNumber", "courseCode", "courseTitle")
SELECT 'BSSE'::"ProgramCode", "semesterNumber", "courseCode", "courseTitle"
FROM "CourseCatalog"
WHERE "programCode" = 'BSCS';
