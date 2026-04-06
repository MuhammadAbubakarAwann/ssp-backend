import XLSX from "xlsx";
import { prisma } from "../../config/database.js";

const normalizeHeader = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");

const excelHeaderToField = {
  "name": "name",
  "reg-no": "regNo",
  "quiz 1": "quiz1",
  "quiz 2": "quiz2",
  "quiz 3": "quiz3",
  "quiz 4": "quiz4",
  "quiz 5": "quiz5",
  "quiz 6": "quiz6",
  "assignment 1": "assignment1",
  "assignment 2": "assignment2",
  "assignment 3": "assignment3",
  "assignment 4": "assignment4",
  "assignment 5": "assignment5",
  "mids percentage": "midsPercentage",
  "attendance percentage": "attendancePercentage",
};

const numericFields = [
  "quiz1",
  "quiz2",
  "quiz3",
  "quiz4",
  "quiz5",
  "quiz6",
  "assignment1",
  "assignment2",
  "assignment3",
  "assignment4",
  "assignment5",
  "midsPercentage",
  "attendancePercentage",
];

const parseNumeric = (value, fieldName) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid numeric value for ${fieldName}`);
  }

  if (parsed < 0 || parsed > 100) {
    throw new Error(`${fieldName} must be between 0 and 100`);
  }

  return parsed;
};

const studentRankingOrder = [
  { midsPercentage: "desc" },
  { attendancePercentage: "desc" },
  { regNo: "asc" },
];

export class TeacherService {
  static async createClassWithStudents(classData, students, teacherId) {
    if (!Array.isArray(students) || students.length === 0) {
      throw new Error("students must be a non-empty array");
    }

    const regNoSet = new Set();
    const normalizedStudents = students.map((student) => {
      const normalized = this.normalizeStudentRow(student);
      const dedupeKey = normalized.regNo.toLowerCase();

      if (regNoSet.has(dedupeKey)) {
        throw new Error(`Duplicate regNo in payload: ${normalized.regNo}`);
      }

      regNoSet.add(dedupeKey);
      return normalized;
    });

    return prisma.$transaction(async (tx) => {
      const teacherClass = await tx.teacherClass.create({
        data: {
          name: classData.name,
          code: classData.code || null,
          section: classData.section || null,
          semester: classData.semester || null,
          teacherId,
        },
      });

      await tx.studentRecord.createMany({
        data: normalizedStudents.map((student) => ({
          classId: teacherClass.id,
          ...student,
        })),
      });

      const createdStudents = await tx.studentRecord.findMany({
        where: { classId: teacherClass.id },
        orderBy: { regNo: "asc" },
      });

      return {
        class: teacherClass,
        count: createdStudents.length,
        students: createdStudents,
      };
    });
  }

  static async assertTeacherClass(classId, teacherId) {
    const teacherClass = await prisma.teacherClass.findFirst({
      where: {
        id: classId,
        teacherId,
      },
    });

    if (!teacherClass) {
      throw new Error("Class not found or access denied");
    }

    return teacherClass;
  }

  static normalizeStudentRow(student) {
    const normalized = {
      name: String(student.name || "").trim(),
      regNo: String(student.regNo || "").trim(),
      quiz1: parseNumeric(student.quiz1, "quiz1"),
      quiz2: parseNumeric(student.quiz2, "quiz2"),
      quiz3: parseNumeric(student.quiz3, "quiz3"),
      quiz4: parseNumeric(student.quiz4, "quiz4"),
      quiz5: parseNumeric(student.quiz5, "quiz5"),
      quiz6: parseNumeric(student.quiz6, "quiz6"),
      assignment1: parseNumeric(student.assignment1, "assignment1"),
      assignment2: parseNumeric(student.assignment2, "assignment2"),
      assignment3: parseNumeric(student.assignment3, "assignment3"),
      assignment4: parseNumeric(student.assignment4, "assignment4"),
      assignment5: parseNumeric(student.assignment5, "assignment5"),
      midsPercentage: parseNumeric(student.midsPercentage, "midsPercentage"),
      attendancePercentage: parseNumeric(student.attendancePercentage, "attendancePercentage"),
    };

    if (!normalized.name) {
      throw new Error("name is required");
    }

    if (!normalized.regNo) {
      throw new Error("regNo is required");
    }

    return normalized;
  }

  static async createClass(data, teacherId) {
    return prisma.teacherClass.create({
      data: {
        name: data.name,
        code: data.code || null,
        section: data.section || null,
        semester: data.semester || null,
        teacherId,
      },
    });
  }

  static async getClasses(teacherId) {
    const classes = await prisma.teacherClass.findMany({
      where: { teacherId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { students: true },
        },
        students: {
          orderBy: studentRankingOrder,
          take: 5,
        },
      },
    });

    return classes.map((teacherClass) => ({
      id: teacherClass.id,
      name: teacherClass.name,
      code: teacherClass.code,
      section: teacherClass.section,
      semester: teacherClass.semester,
      teacherId: teacherClass.teacherId,
      createdAt: teacherClass.createdAt,
      updatedAt: teacherClass.updatedAt,
      totalStudents: teacherClass._count.students,
      topStudents: teacherClass.students,
    }));
  }

  static async getClassDetails(classId, teacherId) {
    const classDetails = await prisma.teacherClass.findFirst({
      where: {
        id: classId,
        teacherId,
      },
      include: {
        _count: {
          select: { students: true },
        },
        students: {
          orderBy: studentRankingOrder,
        },
      },
    });

    if (!classDetails) {
      throw new Error("Class not found or access denied");
    }

    return {
      class: {
        id: classDetails.id,
        name: classDetails.name,
        code: classDetails.code,
        section: classDetails.section,
        semester: classDetails.semester,
        teacherId: classDetails.teacherId,
        createdAt: classDetails.createdAt,
        updatedAt: classDetails.updatedAt,
        totalStudents: classDetails._count.students,
      },
      students: classDetails.students,
    };
  }

  static async updateClassWithStudents(classId, classData, students, teacherId) {
    await this.assertTeacherClass(classId, teacherId);

    if (!Array.isArray(students)) {
      throw new Error("students must be an array");
    }

    const regNoSet = new Set();
    const normalizedStudents = students.map((student) => {
      const normalized = this.normalizeStudentRow(student);
      const dedupeKey = normalized.regNo.toLowerCase();

      if (regNoSet.has(dedupeKey)) {
        throw new Error(`Duplicate regNo in payload: ${normalized.regNo}`);
      }

      regNoSet.add(dedupeKey);
      return {
        id: student.id || null,
        ...normalized,
      };
    });

    return prisma.$transaction(async (tx) => {
      const updateData = {};

      if (classData.name !== undefined && classData.name !== null) {
        updateData.name = classData.name;
      }
      if (classData.code !== undefined) {
        updateData.code = classData.code || null;
      }
      if (classData.section !== undefined) {
        updateData.section = classData.section || null;
      }
      if (classData.semester !== undefined) {
        updateData.semester = classData.semester || null;
      }

      const classUpdateResult = await tx.teacherClass.update({
        where: { id: classId },
        data: updateData.name || updateData.code || updateData.section || updateData.semester ? updateData : {},
      });

      const existingStudents = await tx.studentRecord.findMany({
        where: { classId },
      });

      const existingIds = new Set(existingStudents.map((s) => s.id));
      const incomingIds = new Set(
        normalizedStudents.filter((s) => s.id).map((s) => s.id)
      );

      const studentsToDelete = existingStudents
        .filter((s) => !incomingIds.has(s.id))
        .map((s) => s.id);

      if (studentsToDelete.length > 0) {
        await tx.studentRecord.deleteMany({
          where: { id: { in: studentsToDelete } },
        });
      }

      const upsertedStudents = [];

      for (const student of normalizedStudents) {
        if (student.id) {
          const updated = await tx.studentRecord.update({
            where: { id: student.id },
            data: {
              name: student.name,
              regNo: student.regNo,
              quiz1: student.quiz1,
              quiz2: student.quiz2,
              quiz3: student.quiz3,
              quiz4: student.quiz4,
              quiz5: student.quiz5,
              quiz6: student.quiz6,
              assignment1: student.assignment1,
              assignment2: student.assignment2,
              assignment3: student.assignment3,
              assignment4: student.assignment4,
              assignment5: student.assignment5,
              midsPercentage: student.midsPercentage,
              attendancePercentage: student.attendancePercentage,
            },
          });
          upsertedStudents.push(updated);
        } else {
          const created = await tx.studentRecord.create({
            data: {
              classId,
              name: student.name,
              regNo: student.regNo,
              quiz1: student.quiz1,
              quiz2: student.quiz2,
              quiz3: student.quiz3,
              quiz4: student.quiz4,
              quiz5: student.quiz5,
              quiz6: student.quiz6,
              assignment1: student.assignment1,
              assignment2: student.assignment2,
              assignment3: student.assignment3,
              assignment4: student.assignment4,
              assignment5: student.assignment5,
              midsPercentage: student.midsPercentage,
              attendancePercentage: student.attendancePercentage,
            },
          });
          upsertedStudents.push(created);
        }
      }

      const updatedStudents = await tx.studentRecord.findMany({
        where: { classId },
        orderBy: studentRankingOrder,
      });

      return {
        class: classUpdateResult,
        studentsDeleted: studentsToDelete.length,
        studentsAdded: upsertedStudents.filter((s) => !existingIds.has(s.id)).length,
        studentsUpdated: upsertedStudents.filter((s) => existingIds.has(s.id)).length,
        students: updatedStudents,
      };
    });
  }

  static async upsertStudent(classId, teacherId, studentData) {
    await this.assertTeacherClass(classId, teacherId);
    const normalized = this.normalizeStudentRow(studentData);

    return prisma.studentRecord.upsert({
      where: {
        classId_regNo: {
          classId,
          regNo: normalized.regNo,
        },
      },
      update: {
        ...normalized,
      },
      create: {
        classId,
        ...normalized,
      },
    });
  }

  static async bulkUpsertStudents(classId, teacherId, students) {
    await this.assertTeacherClass(classId, teacherId);

    if (!Array.isArray(students) || students.length === 0) {
      throw new Error("students must be a non-empty array");
    }

    return prisma.$transaction(
      students.map((student) => {
        const normalized = this.normalizeStudentRow(student);

        return prisma.studentRecord.upsert({
          where: {
            classId_regNo: {
              classId,
              regNo: normalized.regNo,
            },
          },
          update: {
            ...normalized,
          },
          create: {
            classId,
            ...normalized,
          },
        });
      })
    );
  }

  static mapExcelRowToStudent(rawRow) {
    const output = {};

    for (const [header, value] of Object.entries(rawRow)) {
      const normalizedHeader = normalizeHeader(header);
      const fieldName = excelHeaderToField[normalizedHeader];

      if (fieldName) {
        output[fieldName] = value;
      }
    }

    return output;
  }

  static parseExcelRows(fileBuffer) {
    const workbook = XLSX.read(fileBuffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      throw new Error("Excel file does not contain any sheets");
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

    if (!rows.length) {
      throw new Error("Excel file is empty");
    }

    const students = rows.map((row, index) => {
      const mapped = this.mapExcelRowToStudent(row);
      try {
        return this.normalizeStudentRow(mapped);
      } catch (error) {
        const reason = error instanceof Error ? error.message : "invalid row";
        throw new Error(`Invalid data in Excel row ${index + 2}: ${reason}`);
      }
    });

    const requiredFields = ["name", "regNo"];
    const firstMapped = this.mapExcelRowToStudent(rows[0]);

    for (const field of requiredFields) {
      if (!Object.prototype.hasOwnProperty.call(firstMapped, field)) {
        throw new Error("Excel headers are invalid. Required headers: Name, Reg-No");
      }
    }

    return students;
  }

  static async importStudentsFromExcel(classId, teacherId, fileBuffer) {
    const students = this.parseExcelRows(fileBuffer);
    const saved = await this.bulkUpsertStudents(classId, teacherId, students);

    return {
      count: saved.length,
      students: saved,
    };
  }

  static async getClassStudents(classId, teacherId) {
    await this.assertTeacherClass(classId, teacherId);

    return prisma.studentRecord.findMany({
      where: { classId },
      orderBy: { regNo: "asc" },
    });
  }

  static async deleteClass(classId, teacherId) {
    const teacherClass = await this.assertTeacherClass(classId, teacherId);

    const studentCount = await prisma.studentRecord.count({
      where: { classId },
    });

    const deleted = await prisma.teacherClass.delete({
      where: { id: classId },
    });

    return {
      classId: deleted.id,
      className: deleted.name,
      studentsDeleted: studentCount,
      message: `Class "${deleted.name}" and ${studentCount} student(s) deleted permanently`,
    };
  }
}
