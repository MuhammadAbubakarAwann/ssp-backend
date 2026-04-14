import 'dotenv/config';
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const academicPrograms = [
  { code: "BSCS", name: "Bachelor of Science in Computer Science" },
  { code: "BSSE", name: "Bachelor of Science in Software Engineering" },
  { code: "BSIT", name: "Bachelor of Science in Information Technology" },
  { code: "BSAI", name: "Bachelor of Science in Artificial Intelligence" },
  { code: "BSCE", name: "Bachelor of Science in Civil Engineering" },
  { code: "BSEE", name: "Bachelor of Science in Electrical Engineering" },
  { code: "BSME", name: "Bachelor of Science in Mechanical Engineering" },
  { code: "BSCHE", name: "Bachelor of Science in Chemical Engineering" },
  { code: "BSDS", name: "Bachelor of Science in Data Science" },
  { code: "BSCY", name: "Bachelor of Science in Cyber Security" },
  { code: "BSMATH", name: "Bachelor of Science in Mathematics" },
  { code: "BSPHY", name: "Bachelor of Science in Physics" },
  { code: "BSCHEM", name: "Bachelor of Science in Chemistry" },
  { code: "BSBIO", name: "Bachelor of Science in Biology" },
  { code: "BBA", name: "Bachelor of Business Administration" },
  { code: "BCOM", name: "Bachelor of Commerce" },
  { code: "BACC", name: "Bachelor of Accounting and Finance" },
  { code: "LLB", name: "Bachelor of Laws" },
  { code: "DPT", name: "Doctor of Physical Therapy" },
  { code: "BARCH", name: "Bachelor of Architecture" },
  { code: "BSN", name: "Bachelor of Science in Nursing" },
  { code: "BPHARM", name: "Bachelor of Pharmacy" },
  { code: "BED", name: "Bachelor of Education" },
];

const baseCourses = [
  [1, "CS-101", "Introduction to Information and Communication Technology"],
  [1, "CS-102", "Programming Fundamentals"],
  [1, "HS-101", "English"],
  [1, "MT-101", "Calculus & Analytical Geometry"],
  [1, "BS-105", "Applied Physics"],
  [1, "HS-102", "Pakistan Studies"],
  [1, "QT-101", "Translation of the Quran: Beliefs"],
  [2, "CS-104", "Object Oriented Programming"],
  [2, "HS-103", "Communication Skills"],
  [2, "CS-103", "Discrete Structures"],
  [2, "IS-211", "Islamic Studies"],
  [2, "CS-204", "Software Engineering"],
  [2, "HS-403", "Management and Entrepreneurship"],
  [3, "CS-201", "Data Structures & Algorithms"],
  [3, "SE-201", "Software Requirement Engineering"],
  [3, "CS-408", "Human Computer Interaction"],
  [3, "MT-203", "Linear Algebra"],
  [3, "HS-302", "International Relations"],
  [3, "QT-201", "Translation of the Quran: Worships"],
  [4, "CS-303", "Operating Systems"],
  [4, "CS-304", "Database Systems"],
  [4, "SE-202", "Software Design & Architecture"],
  [4, "MT-302", "Probability and Statistics"],
  [4, "CS-302", "Artificial Intelligence"],
  [5, "SE-305", "Software Construction and Development"],
  [5, "CS-306", "Data Communication and Computer Networks"],
  [5, "HS-201", "Technical Report Writing"],
  [5, "SE-301", "Business Process Engineering"],
  [5, "CS-313", "Formal Methods in Software Engineering"],
  [5, "QT-301", "Translation of the Quran: Moral Values"],
  [6, "CS-402", "Information Security"],
  [6, "HS-401", "Professional Values and Ethics"],
  [6, "CS-312", "Web Engineering"],
  [6, "SE-306", "Software Quality Engineering"],
  [6, "CS-403", "Mobile Application Development"],
  [6, "SE-303", "Simulation and Modeling"],
  [7, "CS-416", "Natural Language Processing"],
  [7, "ME-407", "Health Safety and Environment"],
  [7, "SE-404", "Big Data Analytics"],
  [7, "SE-401", "Software Project Management"],
  [7, "SE-402", "Software Re-Engineering"],
  [7, "SE-499", "Final Year Design Project - I"],
  [7, "QT-401", "Translation of the Quran: Dealings and Commands"],
  [7, "HS-203", "Community Service"],
  [8, "HS-402", "Economics"],
  [8, "HS-404", "Foreign Language"],
  [8, "SE-405", "Cloud Computing"],
  [8, "SE-407", "Global Software Development"],
  [8, "SE-499", "Final Year Design Project - II"],
];

function buildCourses(programCode) {
  return baseCourses.map(([semesterNumber, courseCode, courseTitle]) => ({
    programCode,
    semesterNumber,
    courseCode,
    courseTitle,
    isActive: true,
  }));
}

async function seedAcademicPrograms() {
  for (const program of academicPrograms) {
    await prisma.academicProgram.upsert({
      where: { code: program.code },
      update: {
        name: program.name,
        isActive: true,
      },
      create: {
        code: program.code,
        name: program.name,
        isActive: true,
      },
    });
  }
}

async function seedCourseCatalog() {
  const courses = [...buildCourses("BSCS"), ...buildCourses("BSSE")];

  for (const course of courses) {
    await prisma.courseCatalog.upsert({
      where: {
        programCode_semesterNumber_courseCode: {
          programCode: course.programCode,
          semesterNumber: course.semesterNumber,
          courseCode: course.courseCode,
        },
      },
      update: {
        courseTitle: course.courseTitle,
        isActive: true,
      },
      create: course,
    });
  }
}

async function main() {
  await seedAcademicPrograms();
  await seedCourseCatalog();

  console.log(`Seeded ${academicPrograms.length} academic programs.`);
  console.log(`Seeded ${baseCourses.length * 2} courses (BSCS + BSSE).`);
}

main()
  .catch((error) => {
    console.error("Catalog seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
