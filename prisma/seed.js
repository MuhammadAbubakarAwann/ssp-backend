import 'dotenv/config';
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const seedUsers = [
  {
    email: "teacher@faculty.hitecuni.edu.pk",
    firstName: "Teacher",
    lastName: "One",
    role: "TEACHER",
  },
  {
    email: "teacher2@faculty.hitecuni.edu.pk",
    firstName: "Teacher",
    lastName: "Two",
    role: "TEACHER",
  },
  {
    email: "teacher3@faculty.hitecuni.edu.pk",
    firstName: "Teacher",
    lastName: "Three",
    role: "TEACHER",
  },
  {
    email: "teacher4@faculty.hitecuni.edu.pk",
    firstName: "Teacher",
    lastName: "Four",
    role: "TEACHER",
  },
];

async function main() {
  const plainPassword = process.env.SEED_DEFAULT_PASSWORD || "12345678";
  const passwordHash = await bcrypt.hash(plainPassword, 12);

  for (const user of seedUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        password: passwordHash,
      },
      create: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        password: passwordHash,
      },
    });
  }

  console.log("Seeded users:");
  for (const user of seedUsers) {
    console.log(`- ${user.role}: ${user.email}`);
  }
  console.log("Seed password:", plainPassword);
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });