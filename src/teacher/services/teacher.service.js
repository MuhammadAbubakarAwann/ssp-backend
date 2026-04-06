import XLSX from "xlsx";
import { createId } from "@paralleldrive/cuid2";
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

const extractRegNoNumericSuffix = (regNo) => {
  const value = String(regNo || "").trim();
  const match = value.match(/(\d+)\s*$/);
  if (!match) {
    return Number.POSITIVE_INFINITY;
  }

  return Number(match[1]);
};

const sortByRegistrationSuffix = (rows, regNoKey = "regNo") => {
  return [...rows].sort((a, b) => {
    const aValue = extractRegNoNumericSuffix(a[regNoKey]);
    const bValue = extractRegNoNumericSuffix(b[regNoKey]);

    if (aValue !== bValue) {
      return aValue - bValue;
    }

    return String(a[regNoKey] || "").localeCompare(String(b[regNoKey] || ""));
  });
};

const roundTo = (value, precision = 2) => Number(Number(value || 0).toFixed(precision));

const percentChange = (current, previous) => {
  if (!previous) {
    return current > 0 ? 100 : 0;
  }

  return ((current - previous) / previous) * 100;
};

export class TeacherService {
  static isNumericId(value) {
    return /^\d+$/.test(String(value || "").trim());
  }

  static buildIdentifierWhere(identifier) {
    const value = String(identifier || "").trim();
    if (!value) {
      throw new Error("Identifier is required");
    }

    if (this.isNumericId(value)) {
      return { id: Number(value) };
    }

    return { publicId: value };
  }

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
          publicId: createId(),
          name: classData.name,
          code: classData.code || null,
          section: classData.section || null,
          semester: classData.semester || null,
          teacherId,
        },
      });

      await tx.studentRecord.createMany({
        data: normalizedStudents.map((student) => ({
          publicId: createId(),
          classId: teacherClass.id,
          ...student,
        })),
      });

      const createdStudents = await tx.studentRecord.findMany({
        where: { classId: teacherClass.id },
        orderBy: { regNo: "asc" },
      });

      return {
        class: {
          ...teacherClass,
          id: teacherClass.publicId,
        },
        count: createdStudents.length,
        students: sortByRegistrationSuffix(createdStudents).map((student) => ({
          ...student,
          id: student.publicId,
        })),
      };
    });
  }

  static async assertTeacherClass(classPublicId, teacherId) {
    const classIdentifierWhere = this.buildIdentifierWhere(classPublicId);

    const teacherClass = await prisma.teacherClass.findFirst({
      where: {
        ...classIdentifierWhere,
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
    const teacherClass = await prisma.teacherClass.create({
      data: {
        publicId: createId(),
        name: data.name,
        code: data.code || null,
        section: data.section || null,
        semester: data.semester || null,
        teacherId,
      },
    });

    return {
      ...teacherClass,
      id: teacherClass.publicId,
    };
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
          orderBy: { regNo: "asc" },
          take: 200,
        },
      },
    });

    return classes.map((teacherClass) => ({
      id: teacherClass.publicId,
      name: teacherClass.name,
      code: teacherClass.code,
      section: teacherClass.section,
      semester: teacherClass.semester,
      teacherId: teacherClass.teacherId,
      createdAt: teacherClass.createdAt,
      updatedAt: teacherClass.updatedAt,
      totalStudents: teacherClass._count.students,
      topStudents: sortByRegistrationSuffix(teacherClass.students)
        .slice(0, 6)
        .map((student) => ({
        ...student,
        id: student.publicId,
      })),
    }));
  }

  static async getClassNames(teacherId) {
    const classes = await prisma.teacherClass.findMany({
      where: { teacherId },
      orderBy: { createdAt: "desc" },
      select: {
        publicId: true,
        name: true,
      },
    });

    return classes.map((item) => ({
      id: item.publicId,
      name: item.name,
    }));
  }

  static async getClassStudentsPredictionStatus(classId, teacherId) {
    const teacherClass = await this.assertTeacherClass(classId, teacherId);

    const students = await prisma.studentRecord.findMany({
      where: { classId: teacherClass.id },
      orderBy: { regNo: "asc" },
      select: {
        id: true,
        name: true,
        regNo: true,
        _count: {
          select: { predictionEntries: true },
        },
      },
    });

    return {
      class: {
        id: teacherClass.publicId,
        name: teacherClass.name,
      },
      students: sortByRegistrationSuffix(students).map((student) => ({
        id: student.publicId,
        name: student.name,
        regNo: student.regNo,
        hasPredictionHistory: student._count.predictionEntries > 0,
      })),
    };
  }

  static async getPredictionHistory(teacherId, filters) {
    const scope = String(filters.scope || "").trim().toUpperCase();

    if (!["CLASS", "SELECTED"].includes(scope)) {
      throw new Error("scope must be CLASS or SELECTED");
    }

    const where = {
      class: {
        teacherId,
      },
      scope,
    };

    let selectedStudent = null;
    let selectedStudentId = null;

    if (scope === "SELECTED") {
      selectedStudentId = String(filters.studentId || "").trim();

      if (selectedStudentId) {
        const studentIdentifierWhere = this.buildIdentifierWhere(selectedStudentId);

        selectedStudent = await prisma.studentRecord.findFirst({
          where: {
            ...studentIdentifierWhere,
            class: {
              teacherId,
            },
          },
          select: {
            id: true,
            publicId: true,
            name: true,
            regNo: true,
          },
        });

        if (!selectedStudent) {
          throw new Error("Student not found in this class");
        }

        where.entries = {
          some: {
            studentRecordId: selectedStudent.id,
          },
        };
      }
    }

    const totalCount = await prisma.predictionRun.count({ where });
    const predictionRuns = await prisma.predictionRun.findMany({
      where,
      orderBy: [
        { generatedAt: "desc" },
        { id: "desc" },
      ],
      take: 7,
      include: {
        class: {
          select: {
            publicId: true,
            name: true,
          },
        },
        entries: {
          select: {
            id: true,
            studentRecordId: true,
            studentName: true,
            regNo: true,
            predictedScore: true,
            studentRecord: {
              select: {
                publicId: true,
              },
            },
          },
        },
      },
    });

    const summarizeRun = (run) => {
      if (scope === "SELECTED" && selectedStudent) {
        const entry = run.entries.find((item) => item.studentRecord?.publicId === selectedStudent.publicId);

        if (!entry) {
          return null;
        }

        return {
          id: run.publicId,
          name: entry.studentName,
          title: run.title,
          class: {
            id: run.class.publicId,
            name: run.class.name,
          },
          date: run.generatedAt,
          status: "completed",
          studentsAnalyzed: 1,
          avgScore: Number(entry.predictedScore.toFixed(2)),
          trend: null,
          scope: run.scope,
        };
      }

      if (scope === "SELECTED") {
        const analyzedCount = run.entries.length;
        const averageScore = analyzedCount
          ? run.entries.reduce((sum, entry) => sum + entry.predictedScore, 0) / analyzedCount
          : 0;

        return {
          id: run.publicId,
          name: run.title,
          title: run.title,
          class: {
            id: run.class.publicId,
            name: run.class.name,
          },
          date: run.generatedAt,
          status: "completed",
          studentsAnalyzed: analyzedCount,
          avgScore: Number(averageScore.toFixed(2)),
          trend: null,
          scope: run.scope,
        };
      }

      const analyzedCount = run.entries.length;
      const averageScore = analyzedCount
        ? run.entries.reduce((sum, entry) => sum + entry.predictedScore, 0) / analyzedCount
        : 0;

      return {
        id: run.publicId,
        name: run.class.name,
        title: run.title,
        class: {
          id: run.class.publicId,
          name: run.class.name,
        },
        date: run.generatedAt,
        status: "completed",
        studentsAnalyzed: analyzedCount,
        avgScore: Number(averageScore.toFixed(2)),
        trend: null,
        scope: run.scope,
      };
    };

    const predictions = [];
    for (let index = 0; index < predictionRuns.length && predictions.length < 6; index += 1) {
      const currentRun = predictionRuns[index];
      const currentSummary = summarizeRun(currentRun);

      if (!currentSummary) {
        continue;
      }

      const previousRun = predictionRuns[index + 1];
      if (previousRun) {
        const previousSummary = summarizeRun(previousRun);

        if (previousSummary) {
          if (currentSummary.avgScore > previousSummary.avgScore) {
            currentSummary.trend = "increasing";
          } else if (currentSummary.avgScore < previousSummary.avgScore) {
            currentSummary.trend = "decreasing";
          } else {
            currentSummary.trend = "stable";
          }
        }
      }

      predictions.push(currentSummary);
    }

    return {
      student: selectedStudent
        ? {
            id: selectedStudent.publicId,
            name: selectedStudent.name,
            regNo: selectedStudent.regNo,
          }
        : null,
      scope,
      totalCount,
      count: predictions.length,
      predictions,
    };
  }

  static async getPredictionMetrics(teacherId) {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const baseWhere = {
      class: {
        teacherId,
      },
    };

    const currentMonthWhere = {
      ...baseWhere,
      generatedAt: {
        gte: currentMonthStart,
        lt: nextMonthStart,
      },
    };

    const lastMonthWhere = {
      ...baseWhere,
      generatedAt: {
        gte: lastMonthStart,
        lt: currentMonthStart,
      },
    };

    const [
      totalPredictions,
      currentMonthPredictions,
      lastMonthPredictions,
      currentMonthActiveClasses,
      lastMonthActiveClasses,
      currentMonthAvgScore,
      lastMonthAvgScore,
    ] = await Promise.all([
      prisma.predictionRun.count({ where: baseWhere }),
      prisma.predictionRun.count({ where: currentMonthWhere }),
      prisma.predictionRun.count({ where: lastMonthWhere }),
      prisma.predictionRun.findMany({
        where: currentMonthWhere,
        distinct: ["classId"],
        select: { classId: true },
      }),
      prisma.predictionRun.findMany({
        where: lastMonthWhere,
        distinct: ["classId"],
        select: { classId: true },
      }),
      prisma.predictionEntry.aggregate({
        where: {
          predictionRun: currentMonthWhere,
        },
        _avg: {
          predictedScore: true,
        },
      }),
      prisma.predictionEntry.aggregate({
        where: {
          predictionRun: lastMonthWhere,
        },
        _avg: {
          predictedScore: true,
        },
      }),
    ]);

    const currentAvgScore = currentMonthAvgScore._avg.predictedScore || 0;
    const lastAvgScore = lastMonthAvgScore._avg.predictedScore || 0;
    const averageImprovement = currentAvgScore - lastAvgScore;

    return {
      period: {
        currentMonthStart,
        lastMonthStart,
      },
      totalPredictions: {
        value: totalPredictions,
        currentMonth: currentMonthPredictions,
        lastMonth: lastMonthPredictions,
        increasePercentage: roundTo(percentChange(currentMonthPredictions, lastMonthPredictions)),
      },
      activeClasses: {
        value: currentMonthActiveClasses.length,
        lastMonth: lastMonthActiveClasses.length,
        increaseNumber: currentMonthActiveClasses.length - lastMonthActiveClasses.length,
      },
      averageImprovement: {
        value: roundTo(currentAvgScore),
        lastMonthValue: roundTo(lastAvgScore),
        increaseNumber: roundTo(averageImprovement),
        increasePercentage: roundTo(percentChange(currentAvgScore, lastAvgScore)),
      },
    };
  }

  static async getPredictionDetails(classId, predictionId, teacherId) {
    const teacherClass = await this.assertTeacherClass(classId, teacherId);
    const predictionIdentifierWhere = this.buildIdentifierWhere(predictionId);

    const prediction = await prisma.predictionRun.findFirst({
      where: {
        ...predictionIdentifierWhere,
        classId: teacherClass.id,
      },
      include: {
        entries: {
          orderBy: [
            { predictedScore: "desc" },
            { regNo: "asc" },
          ],
          select: {
            id: true,
            publicId: true,
            studentRecordId: true,
            studentName: true,
            regNo: true,
            predictedScore: true,
            performance: true,
            passProbability: true,
            modelConfidence: true,
            riskLevel: true,
            suggestions: true,
            studentRecord: {
              select: {
                publicId: true,
              },
            },
          },
        },
      },
    });

    if (!prediction) {
      throw new Error("Prediction not found in this class");
    }

    return {
      class: {
        id: teacherClass.publicId,
        name: teacherClass.name,
      },
      prediction: {
        id: prediction.publicId,
        title: prediction.title,
        scope: prediction.scope,
        date: prediction.generatedAt,
        status: "completed",
        studentsAnalyzed: prediction.entries.length,
      },
      students: sortByRegistrationSuffix(prediction.entries).map((entry) => ({
        id: entry.publicId,
        studentId: entry.studentRecord?.publicId || null,
        name: entry.studentName,
        registrationNum: entry.regNo,
        predictedScore: Number(entry.predictedScore.toFixed(2)),
        performanceCategory: entry.performance,
        passProbability: Number(entry.passProbability.toFixed(4)),
        modelConfidence: Number(entry.modelConfidence.toFixed(4)),
        riskLevel: entry.riskLevel,
        suggestions: entry.suggestions,
      })),
    };
  }

  static async getClassDetails(classId, teacherId) {
    const classDetails = await prisma.teacherClass.findFirst({
      where: {
        publicId: classId,
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
        id: classDetails.publicId,
        name: classDetails.name,
        code: classDetails.code,
        section: classDetails.section,
        semester: classDetails.semester,
        teacherId: classDetails.teacherId,
        createdAt: classDetails.createdAt,
        updatedAt: classDetails.updatedAt,
        totalStudents: classDetails._count.students,
      },
      students: sortByRegistrationSuffix(classDetails.students).map((student) => ({
        ...student,
        id: student.publicId,
      })),
    };
  }

  static normalizePredictionSuggestions(suggestions) {
    if (Array.isArray(suggestions)) {
      return suggestions.map((item) => String(item).trim()).filter(Boolean);
    }

    if (typeof suggestions === "string") {
      return suggestions
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [];
  }

  static normalizePredictionEntry(entry) {
    const predictedScore = parseNumeric(entry.predictedScore, "predictedScore");
    const passProbability = Number(entry.passProbability);
    const modelConfidence = Number(entry.modelConfidence);

    if (Number.isNaN(passProbability) || passProbability < 0 || passProbability > 1) {
      throw new Error("passProbability must be between 0 and 1");
    }

    if (Number.isNaN(modelConfidence) || modelConfidence < 0 || modelConfidence > 1) {
      throw new Error("modelConfidence must be between 0 and 1");
    }

    return {
      studentId: entry.studentId || null,
      name: String(entry.name || "").trim(),
      regNo: String(entry.regNo || "").trim(),
      predictedScore,
      performance: String(entry.performance || "").trim().toUpperCase(),
      passProbability,
      modelConfidence,
      riskLevel: String(entry.riskLevel || "").trim().toUpperCase(),
      suggestions: this.normalizePredictionSuggestions(entry.suggestions),
    };
  }

  static async savePredictionRun(classId, teacherId, payload) {
    const teacherClass = await this.assertTeacherClass(classId, teacherId);

    const predictionName = payload.scope === "CLASS"
      ? teacherClass.name
      : String(payload.predictionName || "").trim();

    if (payload.scope === "SELECTED" && !predictionName) {
      throw new Error("predictionName is required for selected-student predictions");
    }

    const normalizedPredictions = (payload.predictions || []).map((entry) => this.normalizePredictionEntry(entry));
    if (normalizedPredictions.length === 0) {
      throw new Error("predictions must be a non-empty array");
    }

    const classStudents = await prisma.studentRecord.findMany({
      where: { classId: teacherClass.id },
      select: { id: true, publicId: true, name: true, regNo: true },
    });

    const studentsById = new Map();
    classStudents.forEach((student) => {
      studentsById.set(student.publicId, student);
      studentsById.set(String(student.id), student);
    });
    const studentsByRegNo = new Map(classStudents.map((student) => [student.regNo.toLowerCase(), student]));
    const seenRegNos = new Set();

    const entryData = normalizedPredictions.map((entry) => {
      const matchedStudent = entry.studentId
        ? studentsById.get(entry.studentId)
        : studentsByRegNo.get(entry.regNo.toLowerCase());

      if (!matchedStudent) {
        throw new Error(`Student not found in this class: ${entry.regNo}`);
      }

      const duplicateKey = matchedStudent.regNo.toLowerCase();
      if (seenRegNos.has(duplicateKey)) {
        throw new Error(`Duplicate prediction for student: ${matchedStudent.regNo}`);
      }
      seenRegNos.add(duplicateKey);

      return {
        studentRecordId: matchedStudent.id,
        studentName: entry.name || matchedStudent.name,
        regNo: matchedStudent.regNo,
        predictedScore: entry.predictedScore,
        performance: entry.performance,
        passProbability: entry.passProbability,
        modelConfidence: entry.modelConfidence,
        riskLevel: entry.riskLevel,
        suggestions: entry.suggestions,
      };
    });

    return prisma.$transaction(async (tx) => {
      const predictionRun = await tx.predictionRun.create({
        data: {
          publicId: createId(),
          classId: teacherClass.id,
          title: predictionName,
          scope: payload.scope,
        },
      });

      await tx.predictionEntry.createMany({
        data: entryData.map((entry) => ({
          publicId: createId(),
          ...entry,
          predictionRunId: predictionRun.id,
        })),
      });

      const entries = await tx.predictionEntry.findMany({
        where: { predictionRunId: predictionRun.id },
        orderBy: { predictedScore: "desc" },
      });

      return {
        prediction: {
          ...predictionRun,
          id: predictionRun.publicId,
        },
        count: entries.length,
        entries: entries.map((entry) => ({
          ...entry,
          id: entry.publicId,
        })),
      };
    });
  }
  static async updateClassWithStudents(classId, classData, students, teacherId) {
    const teacherClass = await this.assertTeacherClass(classId, teacherId);

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
        where: { id: teacherClass.id },
        data: updateData.name || updateData.code || updateData.section || updateData.semester ? updateData : {},
      });

      const existingStudents = await tx.studentRecord.findMany({
        where: { classId: teacherClass.id },
      });

      const existingIds = new Set(existingStudents.map((s) => s.id));
      const existingByAnyId = new Map();
      existingStudents.forEach((student) => {
        existingByAnyId.set(student.publicId, student);
        existingByAnyId.set(String(student.id), student);
      });

      const incomingDbIds = new Set();
      normalizedStudents.forEach((student) => {
        if (!student.id) {
          return;
        }

        const existing = existingByAnyId.get(String(student.id));
        if (existing) {
          incomingDbIds.add(existing.id);
        }
      });

      const studentsToDelete = existingStudents
        .filter((s) => !incomingDbIds.has(s.id))
        .map((s) => s.id);

      if (studentsToDelete.length > 0) {
        await tx.studentRecord.deleteMany({
          where: { id: { in: studentsToDelete } },
        });
      }

      const upsertedStudents = [];

      for (const student of normalizedStudents) {
        if (student.id) {
          const existing = existingByAnyId.get(String(student.id));
          if (!existing) {
            throw new Error(`Student not found in class: ${student.id}`);
          }

          const updated = await tx.studentRecord.update({
            where: { id: existing.id },
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
              publicId: createId(),
              classId: teacherClass.id,
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
        where: { classId: teacherClass.id },
        orderBy: studentRankingOrder,
      });

      return {
        class: {
          ...classUpdateResult,
          id: classUpdateResult.publicId,
        },
        studentsDeleted: studentsToDelete.length,
        studentsAdded: upsertedStudents.filter((s) => !existingIds.has(s.id)).length,
        studentsUpdated: upsertedStudents.filter((s) => existingIds.has(s.id)).length,
        students: updatedStudents.map((student) => ({
          ...student,
          id: student.publicId,
        })),
      };
    });
  }

  static async upsertStudent(classId, teacherId, studentData) {
    const teacherClass = await this.assertTeacherClass(classId, teacherId);
    const normalized = this.normalizeStudentRow(studentData);

    const student = await prisma.studentRecord.upsert({
      where: {
        classId_regNo: {
          classId: teacherClass.id,
          regNo: normalized.regNo,
        },
      },
      update: {
        ...normalized,
      },
      create: {
        publicId: createId(),
        classId: teacherClass.id,
        ...normalized,
      },
    });

    return {
      ...student,
      id: student.publicId,
    };
  }

  static async bulkUpsertStudents(classId, teacherId, students) {
    const teacherClass = await this.assertTeacherClass(classId, teacherId);

    if (!Array.isArray(students) || students.length === 0) {
      throw new Error("students must be a non-empty array");
    }

    return prisma.$transaction(
      students.map((student) => {
        const normalized = this.normalizeStudentRow(student);

        return prisma.studentRecord.upsert({
          where: {
            classId_regNo: {
              classId: teacherClass.id,
              regNo: normalized.regNo,
            },
          },
          update: {
            ...normalized,
          },
          create: {
            publicId: createId(),
            classId: teacherClass.id,
            ...normalized,
          },
        });
      })
    ).then((rows) => rows.map((student) => ({
      ...student,
      id: student.publicId,
    })));
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
      students: sortByRegistrationSuffix(saved),
    };
  }

  static async getClassStudents(classId, teacherId) {
    const teacherClass = await this.assertTeacherClass(classId, teacherId);

    const students = await prisma.studentRecord.findMany({
      where: { classId: teacherClass.id },
      orderBy: { regNo: "asc" },
    });

    return sortByRegistrationSuffix(students).map((student) => ({
      ...student,
      id: student.publicId,
    }));
  }

  static async deleteClass(classId, teacherId) {
    const teacherClass = await this.assertTeacherClass(classId, teacherId);

    const studentCount = await prisma.studentRecord.count({
      where: { classId: teacherClass.id },
    });

    const deleted = await prisma.teacherClass.delete({
      where: { id: teacherClass.id },
    });

    return {
      classId: deleted.publicId,
      className: deleted.name,
      studentsDeleted: studentCount,
      message: `Class "${deleted.name}" and ${studentCount} student(s) deleted permanently`,
    };
  }
}
