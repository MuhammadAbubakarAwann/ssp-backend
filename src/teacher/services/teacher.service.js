import XLSX from "xlsx";
import { createId } from "@paralleldrive/cuid2";
import { prisma } from "../../config/database.js";
import { PasswordService } from "../../auth/utils/password.js";

const normalizeHeader = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");

const excelHeaderToField = {
  "name": "name",
  "reg-no": "regNo",
  "email": "email",
  "phone": "phoneNumber",
  "phone number": "phoneNumber",
  "address": "address",
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

const summarizeRiskLevel = (entries) => {
  const counts = entries.reduce((acc, entry) => {
    const key = String(entry.riskLevel || "").toUpperCase();
    if (!key) {
      return acc;
    }
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const order = ["HIGH", "MID", "LOW"];
  return order.reduce((winner, key) => {
    if (!winner) {
      return counts[key] ? key : null;
    }
    return counts[key] > (counts[winner] || 0) ? key : winner;
  }, null) || null;
};

const formatRelativePredictionLabel = (date, isLatest = false) => {
  const now = new Date();
  const target = new Date(date);
  const diffMs = Math.max(0, now.getTime() - target.getTime());
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;
  const weekMs = 7 * dayMs;
  const monthMs = 30 * dayMs;
  const yearMs = 365 * dayMs;

  let relative = "Just now";
  if (diffMs < minuteMs) {
    relative = "Just now";
  } else if (diffMs < hourMs) {
    const minutes = Math.floor(diffMs / minuteMs);
    relative = `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  } else if (diffMs < dayMs) {
    const hours = Math.floor(diffMs / hourMs);
    relative = `${hours} hour${hours === 1 ? "" : "s"} ago`;
  } else if (diffMs < weekMs) {
    const days = Math.floor(diffMs / dayMs);
    relative = `${days} day${days === 1 ? "" : "s"} ago`;
  } else if (diffMs < monthMs) {
    const weeks = Math.floor(diffMs / weekMs);
    relative = `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  } else if (diffMs < yearMs) {
    const months = Math.floor(diffMs / monthMs);
    relative = `${months} month${months === 1 ? "" : "s"} ago`;
  } else {
    const years = Math.floor(diffMs / yearMs);
    relative = `${years} year${years === 1 ? "" : "s"} ago`;
  }

  return isLatest ? `Latest (${relative})` : relative;
};

const scoreToGrade = (score) => {
  if (!Number.isFinite(score)) {
    return null;
  }

  if (score >= 85) return "A";
  if (score >= 75) return "B";
  if (score >= 65) return "C";
  if (score >= 50) return "D";
  return "F";
};

const getTrendDirection = (latestScore, previousScore) => {
  if (!Number.isFinite(latestScore) || !Number.isFinite(previousScore)) {
    return "NO_PREVIOUS";
  }

  const delta = latestScore - previousScore;
  if (Math.abs(delta) < 0.01) {
    return "STABLE";
  }

  return delta > 0 ? "UP" : "DOWN";
};

const riskLevelToLabel = (riskLevel) => {
  const value = String(riskLevel || "").trim().toUpperCase();

  if (value === "LOW") return "Low";
  if (value === "MID") return "Medium";
  if (value === "HIGH") return "High";

  return null;
};

const getFlaskPredictionApiBaseUrl = () => {
  const configuredBaseUrl = String(process.env.FLASK_PREDICTION_API_BASE_URL || "").trim();

  if (!configuredBaseUrl) {
    return "http://127.0.0.1:5000";
  }

  return configuredBaseUrl.replace(/\/+$/, "");
};

const normalizeFlaskPerformance = (value) => {
  const normalized = String(value || "").trim().toUpperCase();

  if (["HIGH", "EXCELLENT"].includes(normalized)) {
    return "HIGH";
  }

  if (["AVG", "AVERAGE", "GOOD", "MEDIUM"].includes(normalized)) {
    return "AVG";
  }

  return "LOW";
};

const normalizeFlaskRiskLevel = (value) => {
  const normalized = String(value || "").trim().toUpperCase();

  if (normalized === "HIGH") {
    return "HIGH";
  }

  if (normalized === "MID" || normalized === "MEDIUM") {
    return "MID";
  }

  return "LOW";
};

const toFiniteNumber = (value, fallback = null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildFlaskPredictionStudentPayload = (student, teacherClass) => {
  const courseName = String(
    student.course_name || teacherClass.courseName || teacherClass.subject || teacherClass.name || ""
  ).trim();
  const semester = String(student.semester || teacherClass.semester || "").trim();

  if (!String(student.student_id || "").trim()) {
    throw new Error("student_id is required for Flask prediction payload");
  }

  if (!courseName) {
    throw new Error(`course_name is required for Flask prediction payload (student: ${student.student_id})`);
  }

  if (!semester) {
    throw new Error(`semester is required for Flask prediction payload (student: ${student.student_id})`);
  }

  return {
    student_id: String(student.student_id).trim(),
    course_name: courseName,
    semester,
    q1: toFiniteNumber(student.q1 ?? student.quiz1),
    q2: toFiniteNumber(student.q2 ?? student.quiz2),
    q3: toFiniteNumber(student.q3 ?? student.quiz3),
    q4: toFiniteNumber(student.q4 ?? student.quiz4),
    q5: toFiniteNumber(student.q5 ?? student.quiz5),
    q6: toFiniteNumber(student.q6 ?? student.quiz6),
    a1: toFiniteNumber(student.a1 ?? student.assignment1),
    a2: toFiniteNumber(student.a2 ?? student.assignment2),
    a3: toFiniteNumber(student.a3 ?? student.assignment3),
    a4: toFiniteNumber(student.a4 ?? student.assignment4),
    a5: toFiniteNumber(student.a5 ?? student.assignment5),
    a6: null,
    mids: toFiniteNumber(student.mids ?? student.midsPercentage, 0),
    attendance: toFiniteNumber(student.attendance ?? student.attendancePercentage, 0),
  };
};

const buildFlaskSuggestionSnapshot = (prediction, generatedAt = new Date().toISOString()) => {
  const strengths = Array.isArray(prediction?.strengths) ? prediction.strengths : [];
  const areasForImprovement = Array.isArray(prediction?.areasForImprovement) ? prediction.areasForImprovement : [];
  const nextSteps = Array.isArray(prediction?.nextSteps) ? prediction.nextSteps : [];
  const suggestions = Array.isArray(prediction?.suggestions)
    ? prediction.suggestions
    : [...nextSteps];

  return {
    source: "FLASK_API",
    aiSummary: prediction?.aiSummary || null,
    strengths,
    areasForImprovement,
    nextSteps,
    suggestions,
    featureBreakdown: prediction?.featureBreakdown || null,
    history: prediction?.history || null,
    recommendationSnapshot: {
      strengths,
      areasForImprovement,
      nextSteps,
      source: "FLASK_API",
      generatedAt,
    },
  };
};

const fetchFlaskPredictions = async (students, teacherClass) => {
  const baseUrl = getFlaskPredictionApiBaseUrl();

  const requestBody = {
    students: students.map((student) => buildFlaskPredictionStudentPayload(student, teacherClass)),
  };

  const response = await fetch(`${baseUrl}/predict`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`Flask prediction API failed with status ${response.status}: ${responseText}`);
  }

  let payload;
  try {
    payload = JSON.parse(responseText);
  } catch {
    throw new Error("Flask prediction API returned invalid JSON");
  }

  if (!payload || !Array.isArray(payload.predictions)) {
    throw new Error("Flask prediction API response is invalid");
  }

  return payload;
};

const mapFlaskPredictionResults = (flaskPayload, selectedStudents) => {
  const studentsById = new Map(selectedStudents.map((student) => [String(student.publicId), student]));

  return (flaskPayload.predictions || []).map((item, index) => {
    const prediction = item?.prediction || {};
    const studentId = String(item?.student_id || item?.history?.student_id || "").trim();
    const matchedStudent = studentsById.get(studentId);

    if (!matchedStudent) {
      throw new Error(`Student not found in this class: ${studentId || index}`);
    }

    const generatedAt = new Date().toISOString();
    return {
      studentId: matchedStudent.publicId,
      name: matchedStudent.name,
      regNo: matchedStudent.regNo,
      predictedScore: toFiniteNumber(prediction.predictedScore, 0),
      performance: normalizeFlaskPerformance(prediction.performance),
      passProbability: toFiniteNumber(prediction.passProbability, 0),
      modelConfidence: toFiniteNumber(prediction.modelConfidence, 0),
      riskLevel: normalizeFlaskRiskLevel(prediction.riskLevel),
      suggestions: buildFlaskSuggestionSnapshot(
        {
          ...prediction,
          history: item?.history || null,
        },
        generatedAt
      ),
    };
  });
};

const performanceLabelFromScore = (score) => {
  const value = Number(score);

  if (!Number.isFinite(value)) {
    return null;
  }

  if (value >= 80) return "Excellent";
  if (value >= 65) return "Good";
  if (value >= 50) return "Average";
  return "Needs Improvement";
};

const performanceLabelFromPrediction = (performance, score) => {
  const normalized = String(performance || "").trim().toUpperCase();

  if (normalized === "HIGH") return "Excellent";
  if (normalized === "AVG") return "Average";
  if (normalized === "LOW") return "Needs Improvement";

  return performanceLabelFromScore(score);
};

const inferPassProbability = (finalScore) => {
  const score = Number(finalScore);

  if (!Number.isFinite(score)) {
    return null;
  }

  return Math.max(0, Math.min(1, score / 100));
};

const normalizeSubjectName = (record) => {
  return String(
    record?.class?.subject ||
      record?.class?.courseName ||
      record?.class?.name ||
      "Unknown Subject"
  ).trim();
};

const toIsoString = (value) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const buildStudentHistoryPayload = (records, studentId) => {
  const groups = new Map();

  for (const record of records) {
    const subject = normalizeSubjectName(record);
    const key = subject.toLowerCase();
    const semester = String(record.class?.semester || "").trim() || null;
    const semesterResultDate = record.updatedAt || record.createdAt;
    const group = groups.get(key) || {
      subject,
      previousPredictions: [],
      semesterEndResults: [],
      latestSemester: null,
      latestSemesterAt: null,
      updatedAt: null,
    };

    for (const entry of record.predictionEntries || []) {
      const createdAt = entry.predictionRun?.generatedAt || entry.createdAt || record.updatedAt || record.createdAt;
      const mappedPrediction = {
        course_name: subject,
        semester,
        predictedScore: roundTo(entry.predictedScore),
        performance: performanceLabelFromPrediction(entry.performance, entry.predictedScore),
        passProbability: roundTo(entry.passProbability),
        modelConfidence: roundTo(entry.modelConfidence),
        riskLevel: riskLevelToLabel(entry.riskLevel),
        created_at: toIsoString(createdAt),
      };

      group.previousPredictions.push(mappedPrediction);
      group.updatedAt = group.updatedAt && new Date(group.updatedAt) > new Date(createdAt)
        ? group.updatedAt
        : toIsoString(createdAt);
    }

    const finalScore = record.semesterAvgScore;
    const semesterResultIso = toIsoString(semesterResultDate);

    group.semesterEndResults.push({
      subject,
      semester,
      final_score: finalScore === null || finalScore === undefined ? null : roundTo(finalScore),
      performance: performanceLabelFromScore(finalScore),
      pass_probability: inferPassProbability(finalScore),
      risk_level: riskLevelToLabel(record.overallRiskLevel),
      created_at: semesterResultIso,
    });

    if (!group.latestSemesterAt || (semesterResultIso && String(semesterResultIso) > String(group.latestSemesterAt))) {
      group.latestSemester = semester;
      group.latestSemesterAt = semesterResultIso;
    }

    group.updatedAt = group.updatedAt && new Date(group.updatedAt) > new Date(semesterResultDate)
      ? group.updatedAt
      : semesterResultIso;

    groups.set(key, group);
  }

  const history = Array.from(groups.values())
    .map((group) => ({
      subject: group.subject,
      previous_predictions: group.previousPredictions.sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || ""))),
      semester_end_results: group.semesterEndResults.sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || ""))),
      meta: {
        prediction_count: group.previousPredictions.length,
        result_count: group.semesterEndResults.length,
        latest_semester: group.latestSemester,
        updated_at: group.updatedAt,
      },
    }))
    .sort((a, b) => a.subject.localeCompare(b.subject));

  const predictionCount = history.reduce((sum, item) => sum + item.meta.prediction_count, 0);
  const resultCount = history.reduce((sum, item) => sum + item.meta.result_count, 0);
  const latestSemester = history.reduce((latest, item) => {
    const current = item.meta.latest_semester;

    if (!current) {
      return latest;
    }

    if (!latest) {
      return current;
    }

    return current > latest ? current : latest;
  }, null);

  const latestUpdatedAt = history.reduce((latest, item) => {
    if (!item.meta.updated_at) {
      return latest;
    }

    if (!latest) {
      return item.meta.updated_at;
    }

    return String(item.meta.updated_at) > String(latest) ? item.meta.updated_at : latest;
  }, null);

  return {
    student_id: studentId,
    history,
    meta: {
      subject_count: history.length,
      prediction_count: predictionCount,
      result_count: resultCount,
      latest_semester: latestSemester,
      updated_at: latestUpdatedAt,
    },
  };
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

  static buildStudentEmailFromRegNo(regNo) {
    const normalizedRegNo = String(regNo || "").trim();
    if (!normalizedRegNo) {
      throw new Error("regNo is required to build student email");
    }

    return `${normalizedRegNo}@student.hitecuni.edu.pk`;
  }

  static splitStudentName(fullName) {
    const value = String(fullName || "").trim();
    const [firstName, ...rest] = value.split(/\s+/).filter(Boolean);

    return {
      firstName: firstName || "Student",
      lastName: rest.join(" ") || "User",
    };
  }

  static async ensureStudentUsersExist(students, options = {}) {
    if (!Array.isArray(students) || students.length === 0) {
      return;
    }

    const db = options.tx || prisma;
    const defaultPasswordHash = await PasswordService.hash("12345678");

    const uniqueByEmail = new Map();
    for (const student of students) {
      const email = String(student.email || "").trim();
      if (!email) continue;
      const emailKey = email.toLowerCase();
      if (!uniqueByEmail.has(emailKey)) {
        uniqueByEmail.set(emailKey, {
          email,
          name: student.name,
        });
      }
    }

    const candidates = Array.from(uniqueByEmail.values());
    if (!candidates.length) {
      return;
    }

    const existingUsers = await db.user.findMany({
      where: {
        email: {
          in: candidates.map((student) => student.email),
        },
      },
      select: {
        email: true,
      },
    });

    const existingEmailSet = new Set(existingUsers.map((user) => String(user.email || "").toLowerCase()));

    const usersToCreate = candidates
      .filter((student) => !existingEmailSet.has(student.email.toLowerCase()))
      .map((student) => {
        const { firstName, lastName } = this.splitStudentName(student.name);
        return {
          email: student.email,
          firstName,
          lastName,
          password: defaultPasswordHash,
          role: "STUDENT",
        };
      });

    if (!usersToCreate.length) {
      return;
    }

    await db.user.createMany({
      data: usersToCreate,
      skipDuplicates: true,
    });
  }

  static toDummyExpectedCgpaFromScore(avgScore) {
    const score = Number(avgScore);
    if (!Number.isFinite(score)) {
      return null;
    }

    const raw = (score / 100) * 4;
    return roundTo(Math.min(4, Math.max(0, raw)));
  }

  static pickHigherRisk(currentRisk, candidateRisk) {
    const riskWeight = {
      LOW: 1,
      MID: 2,
      HIGH: 3,
    };

    if (!currentRisk) {
      return candidateRisk || null;
    }

    if (!candidateRisk) {
      return currentRisk;
    }

    return (riskWeight[candidateRisk] || 0) > (riskWeight[currentRisk] || 0)
      ? candidateRisk
      : currentRisk;
  }

  static async refreshSemesterStudentAnalyticsFromPredictions(semester, options = {}) {
    const normalizedSemester = String(semester || "").trim();
    if (!normalizedSemester) {
      return;
    }

    const db = options.tx || prisma;

    const semesterStudents = await db.studentRecord.findMany({
      where: {
        class: {
          semester: normalizedSemester,
        },
      },
      select: {
        regNo: true,
      },
    });

    const allSemesterRegNos = [...new Set(semesterStudents.map((item) => item.regNo))];

    if (allSemesterRegNos.length === 0) {
      return;
    }

    const predictionEntries = await db.predictionEntry.findMany({
      where: {
        predictionRun: {
          class: {
            semester: normalizedSemester,
          },
        },
      },
      select: {
        regNo: true,
        predictedScore: true,
        riskLevel: true,
        predictionRun: {
          select: {
            generatedAt: true,
            classId: true,
          },
        },
      },
      orderBy: {
        predictionRun: {
          generatedAt: "desc",
        },
      },
    });

    const latestByClassAndRegNo = new Map();
    for (const entry of predictionEntries) {
      const classId = entry.predictionRun.classId;
      const key = `${classId}:${String(entry.regNo || "").toLowerCase()}`;
      if (!latestByClassAndRegNo.has(key)) {
        latestByClassAndRegNo.set(key, entry);
      }
    }

    const perStudentAggregate = new Map();
    for (const entry of latestByClassAndRegNo.values()) {
      const regNo = String(entry.regNo || "").trim();
      if (!regNo) {
        continue;
      }

      const key = regNo.toLowerCase();
      const existing = perStudentAggregate.get(key) || {
        regNo,
        scores: [],
        overallRiskLevel: null,
      };

      existing.scores.push(Number(entry.predictedScore));
      existing.overallRiskLevel = this.pickHigherRisk(existing.overallRiskLevel, String(entry.riskLevel || "").toUpperCase());

      perStudentAggregate.set(key, existing);
    }

    const rankedStudents = [...perStudentAggregate.values()]
      .map((item) => {
        const scoreSum = item.scores.reduce((sum, value) => sum + value, 0);
        const scoreAvg = item.scores.length ? scoreSum / item.scores.length : null;

        return {
          regNo: item.regNo,
          semesterAvgScore: scoreAvg === null ? null : roundTo(scoreAvg),
          overallRiskLevel: item.overallRiskLevel,
          expectedCgpa: scoreAvg === null ? null : this.toDummyExpectedCgpaFromScore(scoreAvg),
        };
      })
      .sort((a, b) => {
        const aScore = Number.isFinite(a.semesterAvgScore) ? a.semesterAvgScore : -1;
        const bScore = Number.isFinite(b.semesterAvgScore) ? b.semesterAvgScore : -1;

        if (aScore !== bScore) {
          return bScore - aScore;
        }

        return String(a.regNo).localeCompare(String(b.regNo));
      })
      .map((item, index) => ({
        ...item,
        classRank: index + 1,
      }));

    const analyticsByRegNo = new Map(rankedStudents.map((item) => [String(item.regNo).toLowerCase(), item]));

    for (const regNo of allSemesterRegNos) {
      const analytics = analyticsByRegNo.get(String(regNo).toLowerCase()) || {
        semesterAvgScore: null,
        classRank: null,
        overallRiskLevel: null,
        expectedCgpa: null,
      };

      await db.studentRecord.updateMany({
        where: {
          regNo,
          class: {
            semester: normalizedSemester,
          },
        },
        data: {
          semesterAvgScore: analytics.semesterAvgScore,
          classRank: analytics.classRank,
          overallRiskLevel: analytics.overallRiskLevel,
          expectedCgpa: analytics.expectedCgpa,
        },
      });
    }
  }

  static getCatalogPrograms() {
    return [
      { code: "BSCS", name: "Bachelor of Science in Computer Science" },
      { code: "BSSE", name: "Bachelor of Science in Software Engineering" },
    ];
  }

  static normalizeProgramCode(value) {
    if (value === undefined || value === null || value === "") {
      return null;
    }

    return String(value).trim().toUpperCase();
  }

  static async resolveProgramName(programCode, db = prisma) {
    if (!programCode) {
      return null;
    }

    const program = await db.academicProgram.findFirst({
      where: {
        code: programCode,
        isActive: true,
      },
      select: {
        name: true,
      },
    });

    return program?.name || null;
  }

  static parseSemesterNumber(value) {
    if (value === undefined || value === null || value === "") {
      return null;
    }

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 8) {
      throw new Error("semesterNumber must be an integer between 1 and 8");
    }

    return parsed;
  }

  static async resolveClassMetadata(classData, db = prisma) {
    const programCode = this.normalizeProgramCode(classData.programCode);
    const semesterNumber = this.parseSemesterNumber(classData.semesterNumber);
    const courseCatalogId = classData.courseCatalogId === undefined || classData.courseCatalogId === null || classData.courseCatalogId === ""
      ? null
      : String(classData.courseCatalogId).trim();
    const courseCode = classData.courseCode === undefined || classData.courseCode === null || classData.courseCode === ""
      ? null
      : String(classData.courseCode).trim().toUpperCase();
    const courseName = classData.courseName === undefined || classData.courseName === null || classData.courseName === ""
      ? null
      : String(classData.courseName).trim();
    const subject = classData.subject === undefined || classData.subject === null || classData.subject === ""
      ? null
      : String(classData.subject).trim();
    const requestedName = classData.name === undefined || classData.name === null || classData.name === ""
      ? null
      : String(classData.name).trim();

    let selectedCourse = null;
    if (courseCatalogId !== null) {
      const identifierWhere = this.buildIdentifierWhere(courseCatalogId);
      selectedCourse = await db.courseCatalog.findFirst({
        where: {
          ...identifierWhere,
          isActive: true,
        },
      });
    } else if (programCode && semesterNumber !== null && courseCode) {
      selectedCourse = await db.courseCatalog.findFirst({
        where: {
          programCode,
          semesterNumber,
          courseCode,
          isActive: true,
        },
      });
    }

    const resolvedProgramCode = selectedCourse?.programCode || programCode;
    const resolvedProgramName = await this.resolveProgramName(resolvedProgramCode, db);
    const resolvedCourseCode = selectedCourse?.courseCode || courseCode;
    const resolvedCourseName = selectedCourse?.courseTitle || courseName;
    const resolvedSubject = selectedCourse
      ? `${selectedCourse.courseCode} ${selectedCourse.courseTitle}`
      : (subject || (resolvedCourseCode && resolvedCourseName ? `${resolvedCourseCode} ${resolvedCourseName}` : null));

    return {
      programCode: resolvedProgramCode,
      programName: resolvedProgramName || requestedName || resolvedProgramCode,
      courseCode: resolvedCourseCode,
      courseName: resolvedCourseName,
      subject: resolvedSubject,
      semesterNumber,
      semester: classData.semester === undefined || classData.semester === null || classData.semester === ""
        ? (semesterNumber !== null ? `Semester ${semesterNumber}` : null)
        : String(classData.semester).trim(),
      courseCatalogId: selectedCourse?.id || null,
    };
  }

  static formatTeacherClassResponse(teacherClass, students = null) {
    const response = {
      id: teacherClass.publicId,
      name: teacherClass.name,
      subject: teacherClass.subject,
      section: teacherClass.section,
      semester: teacherClass.semester,
      programCode: teacherClass.programCode,
      programName: teacherClass.programName,
      courseCode: teacherClass.courseCode,
      courseName: teacherClass.courseName,
      teacherId: teacherClass.teacherId,
      createdAt: teacherClass.createdAt,
      updatedAt: teacherClass.updatedAt,
    };

    if (students !== null) {
      const uniqueStudents = Array.from(
        new Map(students.map((student) => [student.id, student])).values()
      );

      response.totalStudents = uniqueStudents.length;
      response.topStudents = sortByRegistrationSuffix(uniqueStudents)
        .slice(0, 6)
        .map((student) => ({
          ...student,
          id: student.publicId,
        }));
    }

    return response;
  }

  static async getCatalogProgramsList() {
    const programs = await prisma.academicProgram.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        code: "asc",
      },
      select: {
        code: true,
        name: true,
      },
    });

    return {
      programs,
    };
  }

  static async getCatalogSemesters(programCode) {
    const normalizedProgram = String(programCode || "").trim().toUpperCase();
    if (!normalizedProgram) {
      throw new Error("programCode is required");
    }

    const program = await prisma.academicProgram.findFirst({
      where: {
        code: normalizedProgram,
        isActive: true,
      },
      select: {
        code: true,
        name: true,
      },
    });

    if (!program) {
      throw new Error(`Program not found: ${normalizedProgram}`);
    }

    const semesters = Array.from({ length: 8 }, (_, index) => {
      const value = index + 1;
      return {
        semesterNumber: value,
        label: `Semester ${value}`,
      };
    });

    return {
      programCode: program.code,
      programName: program.name,
      semesters,
    };
  }

  static async getCatalogSubjects(programCode, semesterNumber) {
    const normalizedProgram = String(programCode || "").trim().toUpperCase();
    const normalizedSemester = this.parseSemesterNumber(semesterNumber);

    if (!normalizedProgram || !normalizedSemester) {
      throw new Error("programCode and semesterNumber are required");
    }

    const program = await prisma.academicProgram.findFirst({
      where: {
        code: normalizedProgram,
        isActive: true,
      },
      select: {
        code: true,
        name: true,
      },
    });

    if (!program) {
      throw new Error(`Program not found: ${normalizedProgram}`);
    }

    const supportsSeededCourses = this.getCatalogPrograms().some((item) => item.code === normalizedProgram);
    if (!supportsSeededCourses) {
      return {
        programCode: program.code,
        programName: program.name,
        semesterNumber: normalizedSemester,
        message: `No subjects/courses found for ${program.code} in semester ${normalizedSemester}`,
        subjects: [],
      };
    }

    const subjects = await prisma.courseCatalog.findMany({
      where: {
        programCode: normalizedProgram,
        semesterNumber: normalizedSemester,
        isActive: true,
      },
      orderBy: {
        courseCode: "asc",
      },
      select: {
        publicId: true,
        courseCode: true,
        courseTitle: true,
      },
    });

    return {
      programCode: program.code,
      programName: program.name,
      semesterNumber: normalizedSemester,
      message: subjects.length
        ? null
        : `No subjects/courses found for ${program.code} in semester ${normalizedSemester}`,
      subjects: subjects.map((item) => ({
        id: item.publicId,
        courseCode: item.courseCode,
        courseName: item.courseTitle,
        subject: `${item.courseCode} ${item.courseTitle}`,
      })),
    };
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

    const result = await prisma.$transaction(async (tx) => {
      const classMetadata = await this.resolveClassMetadata(classData, tx);
      const classSection = classData.section ? String(classData.section).trim() : null;

      if (!classMetadata.programName) {
        throw new Error("programCode or name is required");
      }

      const teacherClass = await tx.teacherClass.create({
        data: {
          publicId: createId(),
          name: classMetadata.programName,
          subject: classMetadata.subject,
          section: classSection,
          semester: classMetadata.semester,
          programCode: classMetadata.programCode,
          programName: classMetadata.programName,
          courseCode: classMetadata.courseCode,
          courseName: classMetadata.courseName,
          semesterNumber: classMetadata.semesterNumber,
          courseCatalogId: classMetadata.courseCatalogId,
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
        class: this.formatTeacherClassResponse(teacherClass),
        count: createdStudents.length,
        students: sortByRegistrationSuffix(createdStudents).map((student) => ({
          ...student,
          id: student.publicId,
        })),
      };
    }, { timeout: 15000, maxWait: 10000 });

    await this.ensureStudentUsersExist(result.students);
    return result;
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
    const regNo = String(student.regNo || "").trim();
    const normalized = {
      name: String(student.name || "").trim(),
      regNo,
      email: student.email === undefined || student.email === null || student.email === ""
        ? this.buildStudentEmailFromRegNo(regNo)
        : String(student.email).trim(),
      phoneNumber: student.phoneNumber === undefined || student.phoneNumber === null || student.phoneNumber === "" ? null : String(student.phoneNumber).trim(),
      address: student.address === undefined || student.address === null || student.address === "" ? null : String(student.address).trim(),
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
    const classMetadata = await this.resolveClassMetadata(data);
    const classSection = data.section ? String(data.section).trim() : null;

    if (!classMetadata.programName) {
      throw new Error("programCode or name is required");
    }

    const teacherClass = await prisma.teacherClass.create({
      data: {
        publicId: createId(),
        name: classMetadata.programName,
        subject: classMetadata.subject,
        section: classSection,
        semester: classMetadata.semester,
        programCode: classMetadata.programCode,
        programName: classMetadata.programName,
        courseCode: classMetadata.courseCode,
        courseName: classMetadata.courseName,
        semesterNumber: classMetadata.semesterNumber,
        courseCatalogId: classMetadata.courseCatalogId,
        teacherId,
      },
    });

    return this.formatTeacherClassResponse(teacherClass);
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

    return classes.map((teacherClass) => {
      const uniqueStudents = Array.from(
        new Map(teacherClass.students.map((student) => [student.id, student])).values()
      );

      return {
        ...this.formatTeacherClassResponse(teacherClass, uniqueStudents),
        totalStudents: teacherClass._count.students,
      };
    });
  }

  static async getClassNames(teacherId) {
    const classes = await prisma.teacherClass.findMany({
      where: { teacherId },
      orderBy: { createdAt: "desc" },
      select: {
        publicId: true,
        subject: true,
        courseCode: true,
        courseName: true,
        section: true,
        semester: true,
        programCode: true,
        semesterNumber: true,
      },
    });

    return classes.map((item) => {
      const baseParts = [item.programCode, item.semesterNumber, item.section]
        .filter((v) => v !== null && v !== undefined)
        .join("-");
      
      const courseParts = [item.courseCode, item.courseName]
        .filter((v) => v !== null && v !== undefined)
        .join(" ");
      
      const formattedName = [baseParts, courseParts]
        .filter((v) => v)
        .join(" ");

      return {
        id: item.publicId,
        name: formattedName,
        subject: item.subject,
        courseCode: item.courseCode,
        courseName: item.courseName,
        semester: item.semester,
        section: item.section,
      };
    });
  }

  static async getClassNamesShort(teacherId) {
    const classes = await prisma.teacherClass.findMany({
      where: { teacherId },
      orderBy: { createdAt: "desc" },
      select: {
        publicId: true,
        subject: true,
        courseCode: true,
        courseName: true,
        section: true,
        semester: true,
        programCode: true,
        semesterNumber: true,
      },
    });

    const uniqueClasses = [];
    const seenKeys = new Set();

    for (const item of classes) {
      const shortName = [item.programCode, item.semesterNumber, item.section]
        .filter((v) => v !== null && v !== undefined && String(v).trim() !== "")
        .join("-");

      if (!shortName || seenKeys.has(shortName)) {
        continue;
      }

      seenKeys.add(shortName);
      uniqueClasses.push({
        id: item.publicId,
        name: shortName,
        subject: item.subject,
        courseCode: item.courseCode,
        courseName: item.courseName,
        semester: item.semester,
        section: item.section,
      });
    }

    return uniqueClasses;
  }

  static async getClassStudentsPredictionStatus(classId, teacherId) {
    const teacherClass = await this.assertTeacherClass(classId, teacherId);

    const students = await prisma.studentRecord.findMany({
      where: { classId: teacherClass.id },
      orderBy: { regNo: "asc" },
      select: {
        id: true,
        publicId: true,
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
        subject: teacherClass.subject,
        courseCode: teacherClass.courseCode,
        courseName: teacherClass.courseName,
        section: teacherClass.section,
        semester: teacherClass.semester,
      },
      students: sortByRegistrationSuffix(students).map((student) => ({
        id: student.publicId,
        studentId: student.publicId,
        studentIdInt: student.id,
        name: student.name,
        regNo: student.regNo,
        hasPredictionHistory: student._count.predictionEntries > 0,
      })),
    };
  }

  static async getClassStudentsPredictionStatusAggregated(classId, teacherId) {
    const teacherClass = await this.assertTeacherClass(classId, teacherId);

    const groupedClasses = await prisma.teacherClass.findMany({
      where: {
        teacherId,
        programCode: teacherClass.programCode,
        semesterNumber: teacherClass.semesterNumber,
        section: teacherClass.section,
      },
      select: {
        id: true,
        publicId: true,
      },
    });

    const classIds = groupedClasses.map((item) => item.id);

    if (!classIds.length) {
      return {
        class: {
          id: teacherClass.publicId,
          name: [teacherClass.programCode, teacherClass.semesterNumber, teacherClass.section]
            .filter((v) => v !== null && v !== undefined && String(v).trim() !== "")
            .join("-"),
          section: teacherClass.section,
          semester: teacherClass.semester,
          programCode: teacherClass.programCode,
          semesterNumber: teacherClass.semesterNumber,
          totalCourses: 0,
        },
        students: [],
      };
    }

    const students = await prisma.studentRecord.findMany({
      where: { classId: { in: classIds } },
      orderBy: { regNo: "asc" },
      select: {
        id: true,
        publicId: true,
        name: true,
        regNo: true,
        classId: true,
        _count: {
          select: { predictionEntries: true },
        },
      },
    });

    const groupedStudents = new Map();
    for (const student of students) {
      const dedupeKey = String(student.regNo || "").trim().toLowerCase();
      if (!dedupeKey) {
        continue;
      }

      const existing = groupedStudents.get(dedupeKey);
      if (!existing) {
        groupedStudents.set(dedupeKey, {
          ...student,
          classIds: new Set([student.classId]),
          hasPredictionHistory: student._count.predictionEntries > 0,
        });
        continue;
      }

      existing.classIds.add(student.classId);
      existing.hasPredictionHistory = existing.hasPredictionHistory || (student._count.predictionEntries > 0);
    }

    const className = [teacherClass.programCode, teacherClass.semesterNumber, teacherClass.section]
      .filter((v) => v !== null && v !== undefined && String(v).trim() !== "")
      .join("-");

    const uniqueStudents = Array.from(groupedStudents.values());

    return {
      class: {
        id: teacherClass.publicId,
        name: className || teacherClass.name,
        section: teacherClass.section,
        semester: teacherClass.semester,
        programCode: teacherClass.programCode,
        semesterNumber: teacherClass.semesterNumber,
        totalCourses: groupedClasses.length,
      },
      students: sortByRegistrationSuffix(uniqueStudents).map((student) => ({
        id: student.publicId,
        studentId: student.publicId,
        studentIdInt: student.id,
        name: student.name,
        regNo: student.regNo,
        enrolledCourses: student.classIds.size,
        hasPredictionHistory: student.hasPredictionHistory,
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
          classMetadata: {
            programCode: run.programCode,
            semesterNumber: run.semesterNumber,
            section: run.section,
            courseCode: run.courseCode,
            courseName: run.courseName,
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
          classMetadata: {
            programCode: run.programCode,
            semesterNumber: run.semesterNumber,
            section: run.section,
            courseCode: run.courseCode,
            courseName: run.courseName,
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
        classMetadata: {
          programCode: run.programCode,
          semesterNumber: run.semesterNumber,
          section: run.section,
          courseCode: run.courseCode,
          courseName: run.courseName,
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

  static async getPerformanceTrend(teacherId) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const monthStarts = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      monthStarts.push(new Date(currentYear, currentMonth - offset, 1));
    }

    const oldestMonthStart = monthStarts[0];
    const nextMonthStart = new Date(currentYear, currentMonth + 1, 1);
    const yearStart = new Date(currentYear, 0, 1);

    const [trendEntries, ytdEntries] = await Promise.all([
      prisma.predictionEntry.findMany({
        where: {
          predictionRun: {
            class: {
              teacherId,
            },
            generatedAt: {
              gte: oldestMonthStart,
              lt: nextMonthStart,
            },
          },
        },
        select: {
          predictedScore: true,
          modelConfidence: true,
          predictionRun: {
            select: {
              generatedAt: true,
            },
          },
        },
      }),
      prisma.predictionEntry.findMany({
        where: {
          predictionRun: {
            class: {
              teacherId,
            },
            generatedAt: {
              gte: yearStart,
              lt: nextMonthStart,
            },
          },
        },
        select: {
          modelConfidence: true,
        },
      }),
    ]);

    const formatMonthKey = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      return `${year}-${month}`;
    };

    const monthlyBuckets = new Map();
    for (const monthStart of monthStarts) {
      monthlyBuckets.set(formatMonthKey(monthStart), {
        accuracies: [],
        predictions: [],
      });
    }

    for (const entry of trendEntries) {
      const generatedAt = entry.predictionRun?.generatedAt;
      if (!generatedAt) {
        continue;
      }

      const monthKey = formatMonthKey(new Date(generatedAt));
      const bucket = monthlyBuckets.get(monthKey);
      if (!bucket) {
        continue;
      }

      const confidencePercent = Number(entry.modelConfidence) * 100;
      if (Number.isFinite(confidencePercent)) {
        bucket.accuracies.push(confidencePercent);
      }

      const predictedScore = Number(entry.predictedScore);
      if (Number.isFinite(predictedScore)) {
        bucket.predictions.push(predictedScore);
      }
    }

    let previousAccuracy = null;
    const graph = monthStarts.map((monthStart) => {
      const month = formatMonthKey(monthStart);
      const bucket = monthlyBuckets.get(month) || { accuracies: [], predictions: [] };

      const accuracyScore = bucket.accuracies.length
        ? roundTo(bucket.accuracies.reduce((sum, value) => sum + value, 0) / bucket.accuracies.length)
        : 0;
      const predictionScore = bucket.predictions.length
        ? roundTo(bucket.predictions.reduce((sum, value) => sum + value, 0) / bucket.predictions.length)
        : 0;

      const monthlyImprovement = previousAccuracy !== null
        ? roundTo(percentChange(accuracyScore, previousAccuracy))
        : 0;

      previousAccuracy = accuracyScore;

      return {
        month,
        accuracyScore,
        predictionScore,
        monthlyImprovement,
      };
    });

    const peakPoint = graph.reduce(
      (best, point) => (point.accuracyScore > best.accuracyScore ? point : best),
      { month: graph[0]?.month || formatMonthKey(monthStarts[0]), accuracyScore: 0 }
    );

    const ytdAccuracies = ytdEntries
      .map((entry) => Number(entry.modelConfidence) * 100)
      .filter((value) => Number.isFinite(value));
    const avgAccuracyYTD = ytdAccuracies.length
      ? roundTo(ytdAccuracies.reduce((sum, value) => sum + value, 0) / ytdAccuracies.length)
      : 0;

    const previousPoint = graph.length > 1 ? graph[graph.length - 2] : null;
    const currentPoint = graph[graph.length - 1] || null;
    const monthlyGainPercent = previousPoint && currentPoint
      ? roundTo(percentChange(currentPoint.accuracyScore, previousPoint.accuracyScore))
      : 0;

    const absGain = Math.abs(monthlyGainPercent);
    let monthlyGainLevel = "LOW";
    if (absGain > 3) {
      monthlyGainLevel = "HIGH";
    } else if (absGain >= 1) {
      monthlyGainLevel = "AVERAGE";
    }

    return {
      summary: {
        peakModelAccuracy: {
          value: roundTo(peakPoint.accuracyScore),
          month: peakPoint.month,
        },
        avgAccuracyYTD,
        monthlyGain: {
          percent: monthlyGainPercent,
          level: monthlyGainLevel,
        },
      },
      graph,
    };
  }

  static async getTeacherDashboardMetrics(teacherId) {
    const [globalPredictions, teacherStudents, teacherClasses, teacherPredictionEntries] = await Promise.all([
      prisma.predictionEntry.findMany({
        select: {
          regNo: true,
          modelConfidence: true,
          predictionRun: {
            select: {
              classId: true,
            },
          },
        },
      }),
      prisma.studentRecord.findMany({
        where: {
          class: {
            teacherId,
          },
        },
        select: {
          regNo: true,
          semesterAvgScore: true,
          overallRiskLevel: true,
          updatedAt: true,
          class: {
            select: {
              semester: true,
              semesterNumber: true,
            },
          },
        },
      }),
      prisma.teacherClass.count({
        where: { teacherId },
      }),
      prisma.predictionEntry.findMany({
        where: {
          predictionRun: {
            class: {
              teacherId,
            },
          },
        },
        orderBy: [
          { createdAt: "desc" },
          { id: "desc" },
        ],
        select: {
          regNo: true,
          predictedScore: true,
          riskLevel: true,
          createdAt: true,
          predictionRun: {
            select: {
              generatedAt: true,
              classId: true,
            },
          },
        },
      }),
    ]);

    const normalizedGlobalStudents = new Map();
    const predictedClasses = new Set();
    let confidenceSum = 0;

    for (const entry of globalPredictions) {
      const regNoKey = String(entry.regNo || "").trim().toLowerCase();
      if (regNoKey) {
        normalizedGlobalStudents.set(regNoKey, true);
      }

      if (entry.predictionRun?.classId) {
        predictedClasses.add(entry.predictionRun.classId);
      }

      confidenceSum += Number(entry.modelConfidence || 0);
    }

    const predictionAccuracy = globalPredictions.length
      ? roundTo((confidenceSum / globalPredictions.length) * 100)
      : 0;

    const teacherStudentMap = new Map();
    for (const student of teacherStudents) {
      const key = String(student.regNo || "").trim().toLowerCase();
      if (key) {
        teacherStudentMap.set(key, true);
      }
    }

    const studentPredictions = new Map();
    for (const entry of teacherPredictionEntries) {
      const key = String(entry.regNo || "").trim().toLowerCase();
      if (!key || !teacherStudentMap.has(key)) {
        continue;
      }

      const current = studentPredictions.get(key) || [];
      current.push(entry);
      studentPredictions.set(key, current);
    }

    const latestStudentScores = [];
    const improvementLatestScores = [];
    const improvementPreviousScores = [];
    let totalAtRisk = 0;

    for (const entries of studentPredictions.values()) {
      const latest = entries[0] || null;
      const previous = entries[1] || null;

      const latestScore = Number(latest?.predictedScore);
      if (Number.isFinite(latestScore)) {
        latestStudentScores.push(latestScore);
      }

      const highCount = entries.filter((entry) => String(entry.riskLevel || "").toUpperCase() === "HIGH").length;
      const midCount = entries.filter((entry) => String(entry.riskLevel || "").toUpperCase() === "MID").length;
      const lowCount = entries.filter((entry) => String(entry.riskLevel || "").toUpperCase() === "LOW").length;
      if (highCount > midCount && highCount > lowCount) {
        totalAtRisk += 1;
      }

      if (entries.length >= 2) {
        const previousScore = Number(previous?.predictedScore);
        if (Number.isFinite(latestScore)) {
          improvementLatestScores.push(latestScore);
        }
        if (Number.isFinite(previousScore)) {
          improvementPreviousScores.push(previousScore);
        }
      }
    }

    const totalStudents = teacherStudentMap.size;
    const averagePerformance = latestStudentScores.length
      ? roundTo(latestStudentScores.reduce((sum, value) => sum + value, 0) / latestStudentScores.length)
      : 0;

    const avgLatestImprovement = improvementLatestScores.length
      ? improvementLatestScores.reduce((sum, value) => sum + value, 0) / improvementLatestScores.length
      : null;
    const avgPreviousImprovement = improvementPreviousScores.length
      ? improvementPreviousScores.reduce((sum, value) => sum + value, 0) / improvementPreviousScores.length
      : null;
    const improvementRate = Number.isFinite(avgLatestImprovement) && Number.isFinite(avgPreviousImprovement)
      ? roundTo(avgLatestImprovement - avgPreviousImprovement)
      : 0;

    return {
      predictionMetrics: {
        totalStudentsPredictedAtLeastOnce: normalizedGlobalStudents.size,
        predictionAccuracy,
        classesPredictionsDoneFor: predictedClasses.size,
      },
      teacherMetrics: {
        totalStudents,
        totalAtRisk,
        averagePerformance,
        improvementRate,
        totalClassesCreatedByTeacher: teacherClasses,
      },
    };
  }

  static async getStudentDashboardMetrics(actor) {
    if (!actor?.userId || String(actor.role || "").toUpperCase() !== "STUDENT") {
      throw new Error("Forbidden: student access required");
    }

    const requester = await prisma.user.findUnique({
      where: { id: Number(actor.userId) },
      select: { email: true },
    });

    if (!requester?.email) {
      throw new Error("Student account email is required");
    }

    const studentRecord = await prisma.studentRecord.findFirst({
      where: {
        email: {
          equals: requester.email,
          mode: "insensitive",
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        regNo: true,
        class: {
          select: {
            publicId: true,
            name: true,
            semester: true,
            programCode: true,
            semesterNumber: true,
            section: true,
          },
        },
      },
    });

    if (!studentRecord?.class) {
      throw new Error("Student class not found");
    }

    const targetClass = studentRecord.class;
    const classStudents = await prisma.studentRecord.findMany({
      where: {
        class: {
          programCode: targetClass.programCode,
          semesterNumber: targetClass.semesterNumber,
          section: targetClass.section,
        },
      },
      select: {
        regNo: true,
        semesterAvgScore: true,
        overallRiskLevel: true,
        updatedAt: true,
        class: {
          select: {
            semester: true,
            semesterNumber: true,
          },
        },
      },
    });

    const classGroupedStudents = new Map();
    for (const student of classStudents) {
      const key = String(student.regNo || "").trim().toLowerCase();
      if (!key) {
        continue;
      }

      const current = classGroupedStudents.get(key) || [];
      current.push(student);
      classGroupedStudents.set(key, current);
    }

    const parseSemesterRank = (student) => {
      const semesterNumber = Number(student.class?.semesterNumber);
      if (Number.isFinite(semesterNumber)) {
        return semesterNumber;
      }

      const semesterText = String(student.class?.semester || "").match(/(\d+)/);
      return semesterText ? Number(semesterText[1]) : -1;
    };

    const studentSummaries = [];
    for (const records of classGroupedStudents.values()) {
      const sortedRecords = [...records].sort((a, b) => {
        const semesterA = parseSemesterRank(a);
        const semesterB = parseSemesterRank(b);
        if (semesterA !== semesterB) {
          return semesterB - semesterA;
        }

        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });

      const latest = sortedRecords[0] || null;
      const previous = sortedRecords[1] || null;
      const latestScore = Number(latest?.semesterAvgScore);
      const previousScore = Number(previous?.semesterAvgScore);
      const improvement = Number.isFinite(latestScore) && Number.isFinite(previousScore)
        ? percentChange(latestScore, previousScore)
        : null;

      studentSummaries.push({
        latestScore: Number.isFinite(latestScore) ? latestScore : null,
        riskLevel: String(latest?.overallRiskLevel || "").toUpperCase() || null,
        improvement,
      });
    }

    const totalStudents = studentSummaries.length;
    const totalAtRisk = studentSummaries.filter((student) => ["HIGH", "MID"].includes(student.riskLevel)).length;
    const averagePerformance = totalStudents
      ? roundTo(studentSummaries.reduce((sum, student) => sum + Number(student.latestScore || 0), 0) / totalStudents)
      : 0;
    const improvementValues = studentSummaries
      .map((student) => student.improvement)
      .filter((value) => Number.isFinite(value));
    const improvementRate = improvementValues.length
      ? roundTo(improvementValues.reduce((sum, value) => sum + value, 0) / improvementValues.length)
      : 0;

    const [globalPredictions] = await Promise.all([
      prisma.predictionEntry.findMany({
        select: {
          regNo: true,
          modelConfidence: true,
          predictionRun: {
            select: {
              classId: true,
            },
          },
        },
      }),
    ]);

    const normalizedGlobalStudents = new Map();
    const predictedClasses = new Set();
    let confidenceSum = 0;

    for (const entry of globalPredictions) {
      const regNoKey = String(entry.regNo || "").trim().toLowerCase();
      if (regNoKey) {
        normalizedGlobalStudents.set(regNoKey, true);
      }

      if (entry.predictionRun?.classId) {
        predictedClasses.add(entry.predictionRun.classId);
      }

      confidenceSum += Number(entry.modelConfidence || 0);
    }

    const predictionAccuracy = globalPredictions.length
      ? roundTo((confidenceSum / globalPredictions.length) * 100)
      : 0;

    return {
      predictionMetrics: {
        totalStudentsPredictedAtLeastOnce: normalizedGlobalStudents.size,
        predictionAccuracy,
        classesPredictionsDoneFor: predictedClasses.size,
      },
      classMetrics: {
        class: {
          id: targetClass.publicId,
          name: [targetClass.programCode, targetClass.semesterNumber, targetClass.section]
            .filter((v) => v !== null && v !== undefined && String(v).trim() !== "")
            .join("-"),
          programCode: targetClass.programCode,
          semester: targetClass.semester,
          semesterNumber: targetClass.semesterNumber,
          section: targetClass.section,
        },
        totalStudents,
        totalAtRisk,
        averagePerformance,
        improvementRate,
      },
    };
  }

  static async getPredictionReports(teacherId, filters = {}) {
    const where = {
      class: {
        teacherId,
      },
    };

    if (filters.scope) {
      where.scope = String(filters.scope).trim().toUpperCase();
    }

    if (filters.classId) {
      const classIdentifierWhere = this.buildIdentifierWhere(filters.classId);
      where.class = {
        teacherId,
        ...classIdentifierWhere,
      };
    }

    const predictionRuns = await prisma.predictionRun.findMany({
      where,
      orderBy: [
        { generatedAt: "desc" },
        { id: "desc" },
      ],
      include: {
        class: {
          select: {
            publicId: true,
            name: true,
          },
        },
        entries: {
          select: {
            predictedScore: true,
            performance: true,
            riskLevel: true,
          },
        },
      },
    });

    const reports = predictionRuns.map((run) => {
      const summary = run.entries.reduce(
        (acc, entry) => {
          const perf = String(entry.performance || "").toUpperCase();
          if (perf === "HIGH") acc.high += 1;
          else if (perf === "AVG") acc.avg += 1;
          else if (perf === "LOW") acc.low += 1;

          acc.totalScore += Number(entry.predictedScore || 0);
          return acc;
        },
        { high: 0, avg: 0, low: 0, totalScore: 0 }
      );

      const analyzedCount = run.entries.length;
      const avgScore = analyzedCount ? summary.totalScore / analyzedCount : 0;

      return {
        predictionId: run.publicId,
        reportCode: run.reportCode || run.publicId,
        type: run.scope,
        class: {
          id: run.class.publicId,
          name: run.class.name,
        },
        summary: {
          high: summary.high,
          avg: summary.avg,
          low: summary.low,
        },
        riskLevel: summarizeRiskLevel(run.entries),
        date: run.generatedAt,
        avgScore: roundTo(avgScore),
        studentsAnalyzed: analyzedCount,
      };
    });

    const min = Number.isFinite(Number(filters.avgScoreMin)) ? Number(filters.avgScoreMin) : null;
    const max = Number.isFinite(Number(filters.avgScoreMax)) ? Number(filters.avgScoreMax) : null;

    const filteredReports = reports.filter((report) => {
      if (min !== null && report.avgScore < min) {
        return false;
      }

      if (max !== null && report.avgScore > max) {
        return false;
      }

      return true;
    });

    return {
      count: filteredReports.length,
      reports: filteredReports,
    };
  }

  static async getStudentPredictions(studentId, teacherId) {
    const studentIdentifierWhere = this.buildIdentifierWhere(studentId);

    const selectedStudent = await prisma.studentRecord.findFirst({
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
        class: {
          select: {
            publicId: true,
            name: true,
          },
        },
      },
    });

    if (!selectedStudent) {
      throw new Error("Student not found in this class");
    }

    const entries = await prisma.predictionEntry.findMany({
      where: {
        studentRecordId: selectedStudent.id,
      },
      select: {
        predictedScore: true,
        createdAt: true,
        predictionRun: {
          select: {
            publicId: true,
            reportCode: true,
            generatedAt: true,
            scope: true,
            title: true,
          },
        },
      },
    });

    const sortedEntries = [...entries].sort((a, b) => new Date(b.predictionRun.generatedAt) - new Date(a.predictionRun.generatedAt));
    const topEntries = sortedEntries.slice(0, 6);

    return {
      class: {
        id: selectedStudent.class.publicId,
        name: selectedStudent.class.name,
      },
      student: {
        id: selectedStudent.publicId,
        name: selectedStudent.name,
        regNo: selectedStudent.regNo,
      },
      count: topEntries.length,
      predictions: topEntries.map((entry, index) => ({
        predictionId: entry.predictionRun.publicId,
        type: entry.predictionRun.scope,
        label: formatRelativePredictionLabel(entry.predictionRun.generatedAt, index === 0),
        date: entry.predictionRun.generatedAt,
        averageScore: roundTo(entry.predictedScore),
      })),
    };
  }

  static async getStudentDetails(studentId, actor, filters = {}) {
    const studentIdentifierWhere = this.buildIdentifierWhere(studentId);

    if (!actor?.userId || !actor?.role) {
      throw new Error("Unauthorized access");
    }

    const role = String(actor.role || "").toUpperCase();
    const userId = Number(actor.userId);

    let accessWhere = null;

    if (role === "TEACHER") {
      accessWhere = {
        ...studentIdentifierWhere,
        class: {
          teacherId: userId,
        },
      };
    } else if (role === "ADMIN") {
      accessWhere = {
        ...studentIdentifierWhere,
      };
    } else if (role === "STUDENT") {
      const requester = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      if (!requester?.email) {
        throw new Error("Student account email is required to access student details");
      }

      accessWhere = {
        ...studentIdentifierWhere,
        email: {
          equals: requester.email,
          mode: "insensitive",
        },
      };
    } else {
      throw new Error("Forbidden: unsupported role");
    }

    const selectedStudent = await prisma.studentRecord.findFirst({
      where: accessWhere,
      select: {
        publicId: true,
        name: true,
        regNo: true,
        email: true,
        class: {
          select: {
            semester: true,
          },
        },
      },
    });

    if (!selectedStudent) {
      throw new Error("Student not found in your classes");
    }

    const targetSemester = String(filters.semester || selectedStudent.class.semester || "").trim();
    if (!targetSemester) {
      throw new Error("semester is required for this student because class semester is missing");
    }

    return this.getStudentPerformanceOverview(studentId, actor, {
      ...filters,
      semester: targetSemester,
    });
  }

  static async getStudentOverallMetrics(studentId, actor, filters = {}) {
    const studentIdentifierWhere = this.buildIdentifierWhere(studentId);

    if (!actor?.userId || !actor?.role) {
      throw new Error("Unauthorized access");
    }

    const role = String(actor.role || "").toUpperCase();
    const userId = Number(actor.userId);

    let accessWhere = null;

    if (role === "TEACHER") {
      accessWhere = {
        ...studentIdentifierWhere,
        class: {
          teacherId: userId,
        },
      };
    } else if (role === "ADMIN") {
      accessWhere = {
        ...studentIdentifierWhere,
      };
    } else if (role === "STUDENT") {
      const requester = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      if (!requester?.email) {
        throw new Error("Student account email is required to access student metrics");
      }

      accessWhere = {
        ...studentIdentifierWhere,
        email: {
          equals: requester.email,
          mode: "insensitive",
        },
      };
    } else {
      throw new Error("Forbidden: unsupported role");
    }

    const selectedStudent = await prisma.studentRecord.findFirst({
      where: accessWhere,
      select: {
        publicId: true,
        name: true,
        regNo: true,
        email: true,
        phoneNumber: true,
        address: true,
        class: {
          select: {
            publicId: true,
            name: true,
            semester: true,
            programCode: true,
            semesterNumber: true,
            section: true,
          },
        },
      },
    });

    if (!selectedStudent) {
      throw new Error("Student not found in your classes");
    }

    const targetClass = selectedStudent.class;
    const enrollments = await prisma.studentRecord.findMany({
      where: {
        regNo: selectedStudent.regNo,
        ...(role === "STUDENT"
          ? {
              email: {
                equals: selectedStudent.email,
                mode: "insensitive",
              },
            }
          : {}),
        class: {
          programCode: targetClass.programCode,
          semesterNumber: targetClass.semesterNumber,
          section: targetClass.section,
        },
      },
      select: {
        publicId: true,
        email: true,
        phoneNumber: true,
        address: true,
        expectedCgpa: true,
        overallRiskLevel: true,
        classRank: true,
        semesterAvgScore: true,
        attendancePercentage: true,
      },
    });

    if (!enrollments.length) {
      throw new Error("Student enrollment not found for the selected program, semester, and section");
    }

    const toAverage = (values) => {
      const numericValues = values.map((value) => Number(value)).filter((value) => Number.isFinite(value));
      if (!numericValues.length) return null;
      return numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;
    };

    const riskLevelToScore = (riskLevel) => {
      const value = String(riskLevel || "").toUpperCase();
      if (value === "LOW") return 1;
      if (value === "MID") return 2;
      if (value === "HIGH") return 3;
      return null;
    };

    const scoreToRiskLevel = (score) => {
      if (!Number.isFinite(score)) return null;
      if (score < 1.5) return "LOW";
      if (score < 2.5) return "MID";
      return "HIGH";
    };

    const avgRiskScore = toAverage(enrollments.map((item) => riskLevelToScore(item.overallRiskLevel)));
    const avgExpectedCgpa = toAverage(enrollments.map((item) => item.expectedCgpa));
    const avgAttendance = toAverage(enrollments.map((item) => item.attendancePercentage));
    const avgClassRank = toAverage(enrollments.map((item) => item.classRank));
    const avgSemesterScore = toAverage(enrollments.map((item) => item.semesterAvgScore));

    const className = [targetClass.programCode, targetClass.semesterNumber, targetClass.section]
      .filter((value) => value !== null && value !== undefined && String(value).trim() !== "")
      .join("-");

    return {
      student: {
        id: selectedStudent.publicId,
        name: selectedStudent.name,
        regNo: selectedStudent.regNo,
        email: selectedStudent.email || enrollments.find((item) => item.email)?.email || null,
        phoneNumber: selectedStudent.phoneNumber || enrollments.find((item) => item.phoneNumber)?.phoneNumber || null,
        address: selectedStudent.address || enrollments.find((item) => item.address)?.address || null,
      },
      class: {
        id: targetClass.publicId,
        name: className || targetClass.name,
        programCode: targetClass.programCode,
        semesterNumber: targetClass.semesterNumber,
        section: targetClass.section,
        semester: targetClass.semester,
      },
      metrics: {
        riskLevel: scoreToRiskLevel(avgRiskScore),
        riskLevelAverage: avgRiskScore !== null ? roundTo(avgRiskScore) : null,
        expectedGpa: avgExpectedCgpa !== null ? roundTo(avgExpectedCgpa) : null,
        attendanceAverage: avgAttendance !== null ? roundTo(avgAttendance) : null,
        classRankAverage: avgClassRank !== null ? roundTo(avgClassRank) : null,
        averageScore: avgSemesterScore !== null ? roundTo(avgSemesterScore) : null,
        enrollmentsCount: enrollments.length,
      },
    };
  }

  static async getSelfStudentDetails(actor, filters = {}) {
    if (!actor?.userId || String(actor.role || "").toUpperCase() !== "STUDENT") {
      throw new Error("Forbidden: student access required");
    }

    const requester = await prisma.user.findUnique({
      where: { id: Number(actor.userId) },
      select: { email: true },
    });

    if (!requester?.email) {
      throw new Error("Student account email is required to access student details");
    }

    const studentRecord = await prisma.studentRecord.findFirst({
      where: {
        email: {
          equals: requester.email,
          mode: "insensitive",
        },
      },
      select: {
        publicId: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    if (!studentRecord) {
      throw new Error("Student record not found for this account");
    }

    return this.getStudentDetails(studentRecord.publicId, actor, filters);
  }

  static async getStudentSubjectPerformance(studentId, actor, filters = {}) {
    const details = await this.getStudentDetails(studentId, actor, filters);
    const role = String(actor.role || "").toUpperCase();

    const where = {
      regNo: details.student.regNo,
      class: {
        semester: details.student.semester,
      },
    };

    if (role === "STUDENT") {
      where.email = {
        equals: details.student.email,
        mode: "insensitive",
      };
    }

    const enrollments = await prisma.studentRecord.findMany({
      where,
      select: {
        publicId: true,
        classId: true,
        class: {
          select: {
            publicId: true,
            name: true,
            subject: true,
            semester: true,
          },
        },
        predictionEntries: {
          select: {
            predictedScore: true,
            performance: true,
            predictionRun: {
              select: {
                generatedAt: true,
              },
            },
          },
          orderBy: {
            predictionRun: {
              generatedAt: "desc",
            },
          },
        },
      },
      orderBy: {
        class: {
          subject: "asc",
        },
      },
    });

    const subjects = enrollments.map((enrollment) => {
      const entries = enrollment.predictionEntries || [];
      const latest = entries[0] || null;
      const previous = entries[1] || null;
      const averageScore = entries.length
        ? roundTo(entries.reduce((sum, entry) => sum + Number(entry.predictedScore || 0), 0) / entries.length)
        : null;
      const latestScore = latest ? roundTo(Number(latest.predictedScore || 0)) : null;
      const previousScore = previous ? roundTo(Number(previous.predictedScore || 0)) : null;

      return {
        classId: enrollment.class.publicId,
        className: enrollment.class.name,
        subject: enrollment.class.subject || enrollment.class.name,
        predictedPerformance: latest?.performance || null,
        grade: scoreToGrade(averageScore),
        averageScore,
        latestScore,
        previousScore,
        trend: getTrendDirection(latestScore, previousScore),
        trendChange: Number.isFinite(latestScore) && Number.isFinite(previousScore)
          ? roundTo(latestScore - previousScore)
          : null,
        latestPredictionAt: latest?.predictionRun?.generatedAt || null,
      };
    });

    return {
      student: {
        id: details.student.id,
        name: details.student.name,
        regNo: details.student.regNo,
        email: details.student.email,
        semester: details.student.semester,
      },
      subjects,
    };
  }

  static async getSelfStudentSubjectPerformance(actor, filters = {}) {
    if (!actor?.userId || String(actor.role || "").toUpperCase() !== "STUDENT") {
      throw new Error("Forbidden: student access required");
    }

    const requester = await prisma.user.findUnique({
      where: { id: Number(actor.userId) },
      select: { email: true },
    });

    if (!requester?.email) {
      throw new Error("Student account email is required to access subject performance");
    }

    const studentRecord = await prisma.studentRecord.findFirst({
      where: {
        email: {
          equals: requester.email,
          mode: "insensitive",
        },
      },
      select: {
        publicId: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    if (!studentRecord) {
      throw new Error("Student record not found for this account");
    }

    return this.getStudentSubjectPerformance(studentRecord.publicId, actor, filters);
  }

  static async getStudentLatestPredictions(studentId, actor, filters = {}) {
    const details = await this.getStudentDetails(studentId, actor, filters);
    const role = String(actor.role || "").toUpperCase();

    const where = {
      regNo: details.student.regNo,
      class: {
        semester: details.student.semester,
      },
    };

    if (role === "STUDENT") {
      where.email = {
        equals: details.student.email,
        mode: "insensitive",
      };
    }

    const enrollments = await prisma.studentRecord.findMany({
      where,
      select: {
        class: {
          select: {
            subject: true,
            name: true,
            semester: true,
          },
        },
        predictionEntries: {
          take: 1,
          orderBy: {
            predictionRun: {
              generatedAt: "desc",
            },
          },
          select: {
            predictedScore: true,
            modelConfidence: true,
            riskLevel: true,
            suggestions: true,
            predictionRun: {
              select: {
                generatedAt: true,
              },
            },
          },
        },
      },
      orderBy: {
        class: {
          subject: "asc",
        },
      },
    });

    const predictions = enrollments
      .map((row) => {
        const latest = row.predictionEntries[0] || null;
        if (!latest) {
          return null;
        }

        return {
          semester: row.class.semester || details.student.semester,
          subject: row.class.subject || row.class.name,
          predictedScore: roundTo(Number(latest.predictedScore || 0)),
          confidence: roundTo(Number(latest.modelConfidence || 0) * 100),
          riskLevel: latest.riskLevel || null,
          recommendations: latest.suggestions ?? null,
          predictedAt: latest.predictionRun?.generatedAt || null,
        };
      })
      .filter(Boolean);

    return {
      student: {
        id: details.student.id,
        name: details.student.name,
        regNo: details.student.regNo,
      },
      predictions,
    };
  }

  static async getSelfStudentLatestPredictions(actor, filters = {}) {
    if (!actor?.userId || String(actor.role || "").toUpperCase() !== "STUDENT") {
      throw new Error("Forbidden: student access required");
    }

    const requester = await prisma.user.findUnique({
      where: { id: Number(actor.userId) },
      select: { email: true },
    });

    if (!requester?.email) {
      throw new Error("Student account email is required to access latest predictions");
    }

    const studentRecord = await prisma.studentRecord.findFirst({
      where: {
        email: {
          equals: requester.email,
          mode: "insensitive",
        },
      },
      select: {
        publicId: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    if (!studentRecord) {
      throw new Error("Student record not found for this account");
    }

    return this.getStudentLatestPredictions(studentRecord.publicId, actor, filters);
  }

  static async getStudentHistory(studentId, actor, filters = {}) {
    const role = String(actor?.role || "").toUpperCase();
    const semesterFilter = String(filters.semester || "").trim();
    const isInternalCaller = !actor?.userId || role === "INTERNAL";

    let selectedStudent = null;

    if (isInternalCaller) {
      selectedStudent = await prisma.studentRecord.findFirst({
        where: {
          ...this.buildIdentifierWhere(studentId),
        },
        select: {
          publicId: true,
          regNo: true,
          email: true,
          class: {
            select: {
              semester: true,
            },
          },
        },
      });

      if (!selectedStudent) {
        throw new Error("Student not found");
      }
    } else {
      const details = await this.getStudentDetails(studentId, actor, filters);

      selectedStudent = {
        publicId: details.student.id,
        regNo: details.student.regNo,
        email: details.student.email,
        class: {
          semester: details.student.semester,
        },
      };
    }

    const where = {
      regNo: selectedStudent.regNo,
      ...(semesterFilter
        ? { class: { semester: semesterFilter } }
        : {}),
    };

    if (!isInternalCaller && role === "STUDENT") {
      where.email = {
        equals: selectedStudent.email,
        mode: "insensitive",
      };
    }

    const records = await prisma.studentRecord.findMany({
      where,
      select: {
        publicId: true,
        semesterAvgScore: true,
        overallRiskLevel: true,
        createdAt: true,
        updatedAt: true,
        class: {
          select: {
            publicId: true,
            name: true,
            subject: true,
            courseName: true,
            semester: true,
            courseCode: true,
          },
        },
        predictionEntries: {
          select: {
            predictedScore: true,
            performance: true,
            passProbability: true,
            modelConfidence: true,
            riskLevel: true,
            createdAt: true,
            predictionRun: {
              select: {
                generatedAt: true,
              },
            },
          },
          orderBy: {
            predictionRun: {
              generatedAt: "desc",
            },
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return buildStudentHistoryPayload(records, selectedStudent.publicId);
  }

  static async getSelfStudentHistory(actor, filters = {}) {
    if (!actor?.userId || String(actor.role || "").toUpperCase() !== "STUDENT") {
      throw new Error("Forbidden: student access required");
    }

    const requester = await prisma.user.findUnique({
      where: { id: Number(actor.userId) },
      select: { email: true },
    });

    if (!requester?.email) {
      throw new Error("Student account email is required to access history");
    }

    const studentRecord = await prisma.studentRecord.findFirst({
      where: {
        email: {
          equals: requester.email,
          mode: "insensitive",
        },
      },
      select: {
        publicId: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    if (!studentRecord) {
      throw new Error("Student record not found for this account");
    }

    return this.getStudentHistory(studentRecord.publicId, actor, filters);
  }

  static async getBulkStudentHistory(studentIds, actor, filters = {}) {
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      throw new Error("At least one student id is required");
    }

    const uniqueStudentIds = [...new Set(studentIds.map((value) => String(value).trim()).filter(Boolean))];

    if (uniqueStudentIds.length === 0) {
      throw new Error("At least one valid student id is required");
    }

    const results = await Promise.all(
      uniqueStudentIds.map(async (studentId) => {
        try {
          const history = await this.getStudentHistory(studentId, actor, filters);

          return {
            studentId,
            success: true,
            data: history,
          };
        } catch (error) {
          return {
            studentId,
            success: false,
            message: error instanceof Error ? error.message : "Failed to fetch student history",
          };
        }
      })
    );

    return {
      total: results.length,
      successCount: results.filter((item) => item.success).length,
      failureCount: results.filter((item) => !item.success).length,
      results,
    };
  }

  static async getStudentRecommendations(studentId, actor, filters = {}) {
    const details = await this.getStudentDetails(studentId, actor, filters);
    const role = String(actor.role || "").toUpperCase();

    const entryWhere = {
      regNo: details.student.regNo,
      predictionRun: {
        class: {
          semester: details.student.semester,
        },
      },
    };

    if (role === "STUDENT") {
      entryWhere.studentRecord = {
        email: {
          equals: details.student.email,
          mode: "insensitive",
        },
      };
    }

    const latestEntry = await prisma.predictionEntry.findFirst({
      where: entryWhere,
      select: {
        id: true,
        publicId: true,
        suggestions: true,
        predictionRun: {
          select: {
            generatedAt: true,
          },
        },
      },
      orderBy: {
        predictionRun: {
          generatedAt: "desc",
        },
      },
    });

    if (!latestEntry) {
      throw new Error("No prediction found for this student in the selected semester");
    }

    const defaultSnapshot = {
      strengths: [
        "Personalized strengths will appear here once a new AI prediction is generated for this student.",
      ],
      areasForImprovement: [
        "Personalized areas for improvement will appear here once a new AI prediction is generated for this student.",
      ],
      nextSteps: [
        "Ask the teacher to re-run the AI prediction for this class to generate up-to-date recommendations.",
      ],
      source: "NOT_GENERATED",
      generatedAt: new Date().toISOString(),
    };

    let savedSuggestions = latestEntry.suggestions;
    const currentSuggestions = latestEntry.suggestions;

    const hasSnapshot =
      currentSuggestions &&
      typeof currentSuggestions === "object" &&
      !Array.isArray(currentSuggestions) &&
      currentSuggestions.recommendationSnapshot &&
      Array.isArray(currentSuggestions.recommendationSnapshot.strengths) &&
      Array.isArray(currentSuggestions.recommendationSnapshot.areasForImprovement) &&
      Array.isArray(currentSuggestions.recommendationSnapshot.nextSteps);

    if (!hasSnapshot) {
      const nextSuggestions =
        currentSuggestions && typeof currentSuggestions === "object" && !Array.isArray(currentSuggestions)
          ? {
              ...currentSuggestions,
              recommendationSnapshot: defaultSnapshot,
            }
          : {
              legacySuggestions: currentSuggestions ?? null,
              recommendationSnapshot: defaultSnapshot,
            };

      const updatedEntry = await prisma.predictionEntry.update({
        where: { id: latestEntry.id },
        data: {
          suggestions: nextSuggestions,
        },
        select: {
          suggestions: true,
        },
      });

      savedSuggestions = updatedEntry.suggestions;
    }

    const snapshot =
      savedSuggestions && typeof savedSuggestions === "object" && !Array.isArray(savedSuggestions)
        ? savedSuggestions.recommendationSnapshot
        : null;

    if (!snapshot) {
      throw new Error("Failed to build recommendation snapshot");
    }

    return {
      student: {
        id: details.student.id,
        name: details.student.name,
        regNo: details.student.regNo,
        semester: details.student.semester,
      },
      recommendations: {
        strengths: snapshot.strengths || [],
        areasForImprovement: snapshot.areasForImprovement || [],
        nextSteps: snapshot.nextSteps || [],
        source: snapshot.source || "NOT_GENERATED",
        generatedAt: snapshot.generatedAt || latestEntry.predictionRun.generatedAt,
      },
    };
  }

  static async getSelfStudentRecommendations(actor, filters = {}) {
    if (!actor?.userId || String(actor.role || "").toUpperCase() !== "STUDENT") {
      throw new Error("Forbidden: student access required");
    }

    const requester = await prisma.user.findUnique({
      where: { id: Number(actor.userId) },
      select: { email: true },
    });

    if (!requester?.email) {
      throw new Error("Student account email is required to access recommendations");
    }

    const studentRecord = await prisma.studentRecord.findFirst({
      where: {
        email: {
          equals: requester.email,
          mode: "insensitive",
        },
      },
      select: {
        publicId: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    if (!studentRecord) {
      throw new Error("Student record not found for this account");
    }

    return this.getStudentRecommendations(studentRecord.publicId, actor, filters);
  }

  static async getStudentPerformanceOverview(studentId, actor, filters = {}) {
    const studentIdentifierWhere = this.buildIdentifierWhere(studentId);

    if (!actor?.userId || !actor?.role) {
      throw new Error("Unauthorized access");
    }

    const role = String(actor.role || "").toUpperCase();
    const userId = Number(actor.userId);

    let accessWhere = null;

    if (role === "TEACHER") {
      accessWhere = {
        ...studentIdentifierWhere,
        class: {
          teacherId: userId,
        },
      };
    } else if (role === "ADMIN") {
      accessWhere = {
        ...studentIdentifierWhere,
      };
    } else if (role === "STUDENT") {
      const requester = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      if (!requester?.email) {
        throw new Error("Student account email is required");
      }

      accessWhere = {
        ...studentIdentifierWhere,
        email: {
          equals: requester.email,
          mode: "insensitive",
        },
      };
    } else {
      throw new Error("Forbidden: unsupported role");
    }

    const selectedStudent = await prisma.studentRecord.findFirst({
      where: accessWhere,
      select: {
        publicId: true,
        name: true,
        regNo: true,
        email: true,
        class: {
          select: {
            semester: true,
          },
        },
      },
    });

    if (!selectedStudent) {
      throw new Error("Student not found");
    }

    let targetSemester = String(filters.semester || selectedStudent.class.semester || "").trim();
    if (!targetSemester) {
      const latestEnrollmentWithSemester = await prisma.studentRecord.findFirst({
        where: {
          regNo: selectedStudent.regNo,
          ...(role === "STUDENT"
            ? {
                email: {
                  equals: selectedStudent.email,
                  mode: "insensitive",
                },
              }
            : {}),
          class: {
            semester: {
              not: null,
            },
          },
        },
        select: {
          class: {
            select: {
              semester: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      });

      targetSemester = String(latestEnrollmentWithSemester?.class?.semester || "").trim();
    }
    if (!targetSemester) {
      throw new Error("Student semester not found. Please pass ?semester=... in query");
    }

    // Get student enrollments for the semester
    const enrollments = await prisma.studentRecord.findMany({
      where: {
        regNo: selectedStudent.regNo,
        ...(role === "STUDENT"
          ? {
              email: {
                equals: selectedStudent.email,
                mode: "insensitive",
              },
            }
          : {}),
        class: {
          semester: targetSemester,
        },
      },
      select: {
        publicId: true,
        id: true,
        name: true,
        regNo: true,
        createdAt: true,
        updatedAt: true,
        quiz1: true,
        quiz2: true,
        quiz3: true,
        quiz4: true,
        quiz5: true,
        quiz6: true,
        assignment1: true,
        assignment2: true,
        assignment3: true,
        assignment4: true,
        assignment5: true,
        midsPercentage: true,
        semesterAvgScore: true,
        classRank: true,
        class: {
          select: {
            publicId: true,
            name: true,
            subject: true,
          },
        },
        predictionEntries: {
          select: {
            predictedScore: true,
            performance: true,
          },
        },
      },
      orderBy: {
        class: {
          subject: "asc",
        },
      },
    });

    if (!enrollments.length) {
      throw new Error("Student enrollment not found for the semester");
    }

    // Count unique students in the semester so rank is out of total students, not total enrollments.
    const semesterStudents = await prisma.studentRecord.findMany({
      where: {
        class: {
          semester: targetSemester,
        },
      },
      select: {
        regNo: true,
      },
      distinct: ["regNo"],
    });

    const classSize = semesterStudents.length || 1;

    const firstEnrollment = enrollments[0];
    const averageScore = firstEnrollment.semesterAvgScore || 0;
    const classRank = firstEnrollment.classRank || classSize;
    const percentile = ((classSize - classRank) / classSize) * 100;

    // Determine standing
    let standing = "Fair Standing";
    if (percentile >= 90) standing = "Excellent Standing";
    else if (percentile >= 75) standing = "Good Standing";
    else if (percentile >= 50) standing = "Satisfactory Standing";
    else if (percentile >= 25) standing = "Warning";
    else standing = "Critical";

    const previousSemesterEnrollment = await prisma.studentRecord.findFirst({
      where: {
        regNo: selectedStudent.regNo,
        ...(role === "STUDENT"
          ? {
              email: {
                equals: selectedStudent.email,
                mode: "insensitive",
              },
            }
          : {}),
        semesterAvgScore: {
          not: null,
        },
        class: {
          semester: {
            not: targetSemester,
          },
        },
      },
      select: {
        semesterAvgScore: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    // Calculate improvement rate
    const currentAvg = firstEnrollment.semesterAvgScore || 0;
    const previousAvg = Number(previousSemesterEnrollment?.semesterAvgScore || 0);
    const improvementRate = previousAvg > 0 ? ((currentAvg - previousAvg) / previousAvg) * 100 : (currentAvg > 0 ? 100 : 0);

    // Count strong subjects (A or A+ grades, which is 85+ score)
    const strongSubjects = enrollments.filter((e) => {
      const predictions = e.predictionEntries || [];
      if (!predictions.length) return false;
      const avgScore = predictions.reduce((sum, p) => sum + (p.predictedScore || 0), 0) / predictions.length;
      return avgScore >= 85;
    }).length;

    const toPercent = (rawValue) => {
      if (rawValue === null || rawValue === undefined || rawValue === "") {
        return null;
      }
      if (!Number.isFinite(Number(rawValue))) {
        return null;
      }
      const value = Number(rawValue);
      const asPercent = value <= 10 ? value * 10 : value;
      return roundTo(Math.max(0, Math.min(100, asPercent)));
    };

    const recentRows = [...enrollments].sort((a, b) => new Date(b.createdAt || b.updatedAt).getTime() - new Date(a.createdAt || a.updatedAt).getTime());

    const recentQuizzes = [];
    const recentAssignments = [];
    const recentExams = [];

    for (const row of recentRows) {
      const subjectName = row.class.subject || row.class.name || "Unknown Subject";
      const uploadTime = row.createdAt || row.updatedAt || new Date();
      const quizFields = [row.quiz6, row.quiz5, row.quiz4, row.quiz3, row.quiz2, row.quiz1];
      const assignmentFields = [row.assignment5, row.assignment4, row.assignment3, row.assignment2, row.assignment1];

      for (const score of quizFields) {
        const percent = toPercent(score);
        if (percent !== null && recentQuizzes.length < 3) {
          recentQuizzes.push({
            subject: subjectName,
            score: `${percent}%`,
            submittedAt: formatRelativePredictionLabel(uploadTime),
          });
        }
        if (recentQuizzes.length >= 3) break;
      }

      for (let i = 0; i < assignmentFields.length; i += 1) {
        const score = assignmentFields[i];
        const percent = toPercent(score);
        if (percent !== null && recentAssignments.length < 3) {
          recentAssignments.push({
            subject: subjectName,
            name: `Assignment ${5 - i}`,
            score: `${percent}%`,
            submittedAt: formatRelativePredictionLabel(uploadTime),
          });
        }
        if (recentAssignments.length >= 3) break;
      }

      const mids = Number(row.midsPercentage);
      if (Number.isFinite(mids) && recentExams.length < 3) {
        const percent = Math.max(0, Math.min(100, roundTo(mids)));
        const marksOutOf50 = roundTo((percent / 100) * 50);
        recentExams.push({
          subject: subjectName,
          type: "MID",
          score: `${percent}% (${marksOutOf50}/50)`,
          submittedAt: formatRelativePredictionLabel(uploadTime),
        });
      }

      if (recentQuizzes.length >= 3 && recentAssignments.length >= 3 && recentExams.length >= 3) {
        break;
      }
    }

    return {
      student: {
        id: selectedStudent.publicId,
        name: selectedStudent.name,
        regNo: selectedStudent.regNo,
        semester: targetSemester,
      },
      performance: {
        averageScore: roundTo(averageScore),
        classRank: `${classRank} out of ${classSize}`,
        percentileStanding: `Top ${roundTo(percentile)}% - ${standing}`,
        improvementRate: `${roundTo(improvementRate)}% ${improvementRate > 0 ? "↑" : improvementRate < 0 ? "↓" : "→"}`,
        strongSubjects: `${strongSubjects} out of ${enrollments.length} (A or A+ grades)`,
      },
      recentActivity: {
        quizzes: recentQuizzes,
        assignments: recentAssignments,
        exams: recentExams,
      },
    };
  }

  static async getSelfStudentPerformanceOverview(actor, filters = {}) {
    if (!actor?.userId || String(actor.role || "").toUpperCase() !== "STUDENT") {
      throw new Error("Forbidden: student access required");
    }

    const requester = await prisma.user.findUnique({
      where: { id: Number(actor.userId) },
      select: { email: true },
    });

    if (!requester?.email) {
      throw new Error("Student account email is required");
    }

    const studentRecord = await prisma.studentRecord.findFirst({
      where: {
        email: {
          equals: requester.email,
          mode: "insensitive",
        },
      },
      select: {
        publicId: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    if (!studentRecord) {
      throw new Error("Student record not found");
    }

    return this.getStudentPerformanceOverview(studentRecord.publicId, actor, filters);
  }

  static async getStudentPredictionDetails(predictionId, studentId, teacherId) {
    const predictionIdentifierWhere = this.buildIdentifierWhere(predictionId);
    const studentIdentifierWhere = this.buildIdentifierWhere(studentId);

    const prediction = await prisma.predictionRun.findFirst({
      where: {
        ...predictionIdentifierWhere,
        class: {
          teacherId,
        },
      },
      select: {
        id: true,
        publicId: true,
        reportCode: true,
        title: true,
        scope: true,
        generatedAt: true,
        class: {
          select: {
            id: true,
            publicId: true,
            name: true,
            subject: true,
          },
        },
      },
    });

    if (!prediction) {
      throw new Error("Prediction not found or access denied");
    }

    const student = await prisma.studentRecord.findFirst({
      where: {
        ...studentIdentifierWhere,
        classId: prediction.class.id,
      },
      select: {
        id: true,
        publicId: true,
        name: true,
        regNo: true,
      },
    });

    if (!student) {
      throw new Error("Student not found in this class");
    }

    const entry = await prisma.predictionEntry.findFirst({
      where: {
        predictionRunId: prediction.id,
        studentRecordId: student.id,
      },
      select: {
        publicId: true,
        predictedScore: true,
        passProbability: true,
        modelConfidence: true,
        riskLevel: true,
        performance: true,
      },
    });

    if (!entry) {
      throw new Error("Prediction entry not found for this student");
    }

    return {
      class: {
        id: prediction.class.publicId,
        name: prediction.class.name,
        subject: prediction.class.subject,
      },
      prediction: {
        id: prediction.publicId,
        reportCode: prediction.reportCode || `RPT-${prediction.publicId}`,
        title: prediction.title,
        scope: prediction.scope,
        date: prediction.generatedAt,
      },
      student: {
        id: student.publicId,
        name: student.name,
        regNo: student.regNo,
      },
      details: {
        predictionEntryId: entry.publicId,
        predictedScore: roundTo(entry.predictedScore),
        passProbability: roundTo(entry.passProbability * 100),
        confidence: roundTo(entry.modelConfidence * 100),
        riskLevel: entry.riskLevel,
        subjectPerformance: entry.performance,
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
            createdAt: true,
            updatedAt: true,
            studentRecord: {
              select: {
                publicId: true,
                expectedCgpa: true,
                classRank: true,
                overallRiskLevel: true,
                semesterAvgScore: true,
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
        classMetadata: {
          programCode: prediction.programCode,
          semesterNumber: prediction.semesterNumber,
          section: prediction.section,
          courseCode: prediction.courseCode,
          courseName: prediction.courseName,
        },
        date: prediction.generatedAt,
        status: "completed",
        studentsAnalyzed: prediction.entries.length,
      },
      students: sortByRegistrationSuffix(prediction.entries).map((entry) => ({
        id: entry.publicId,
        studentId: entry.studentRecord?.publicId || null,
        name: entry.studentName,
        regNo: entry.regNo,
        predictedScore: roundTo(entry.predictedScore),
        performance: entry.performance,
        passProbability: entry.passProbability,
        modelConfidence: entry.modelConfidence,
        riskLevel: entry.riskLevel,
        expectedCgpa: entry.studentRecord?.expectedCgpa || null,
        classRank: entry.studentRecord?.classRank || null,
        overallRiskLevel: entry.studentRecord?.overallRiskLevel || null,
        semesterAvgScore: entry.studentRecord?.semesterAvgScore || null,
        suggestions: entry.suggestions,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
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
        subject: classDetails.subject,
        section: classDetails.section,
        semester: classDetails.semester,
        courseCode: classDetails.courseCode,
        courseName: classDetails.courseName,
        teacherId: classDetails.teacherId,
        createdAt: classDetails.createdAt,
        updatedAt: classDetails.updatedAt,
        totalStudents: classDetails._count.students,
      },
      students: sortByRegistrationSuffix(classDetails.students).map((student) => ({
        id: student.publicId,
        studentId: student.publicId,
        name: student.name,
        regNo: student.regNo,
        email: student.email,
        phoneNumber: student.phoneNumber,
        address: student.address,
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
        createdAt: student.createdAt,
        updatedAt: student.updatedAt,
      })),
    };
  }

  static async getClassPerformanceOverview(classId, teacherId) {
    const teacherClass = await this.assertTeacherClass(classId, teacherId);

    const [students, predictionRuns] = await Promise.all([
      prisma.studentRecord.findMany({
        where: {
          classId: teacherClass.id,
        },
        select: {
          regNo: true,
          overallRiskLevel: true,
          semesterAvgScore: true,
        },
      }),
      prisma.predictionRun.findMany({
        where: {
          classId: teacherClass.id,
        },
        orderBy: [
          { generatedAt: "desc" },
          { id: "desc" },
        ],
        take: 2,
        select: {
          id: true,
          publicId: true,
          generatedAt: true,
          entries: {
            select: {
              predictedScore: true,
              riskLevel: true,
            },
          },
        },
      }),
    ]);

    const totalStudents = students.length;
    const latestRun = predictionRuns[0] || null;
    const previousRun = predictionRuns[1] || null;

    const averageScoreFromRun = (run) => {
      if (!run?.entries?.length) {
        return null;
      }

      const total = run.entries.reduce((sum, entry) => sum + Number(entry.predictedScore || 0), 0);
      return total / run.entries.length;
    };

    const latestAvg = averageScoreFromRun(latestRun);
    const previousAvg = averageScoreFromRun(previousRun);

    const avgPerformance = Number.isFinite(latestAvg)
      ? roundTo(latestAvg)
      : roundTo(
          students.length
            ? students.reduce((sum, row) => sum + Number(row.semesterAvgScore || 0), 0) / students.length
            : 0
        );

    const studentsAtRisk = latestRun?.entries?.length
      ? latestRun.entries.filter((entry) => {
          const risk = String(entry.riskLevel || "").toUpperCase();
          return risk === "HIGH" || risk === "MID";
        }).length
      : students.filter((row) => {
          const risk = String(row.overallRiskLevel || "").toUpperCase();
          return risk === "HIGH" || risk === "MID";
        }).length;

    const improvementRate = Number.isFinite(latestAvg) && Number.isFinite(previousAvg)
      ? roundTo(percentChange(latestAvg, previousAvg))
      : 0;

    return {
      class: {
        id: teacherClass.publicId,
        name: teacherClass.name,
        subject: teacherClass.subject,
        section: teacherClass.section,
        semester: teacherClass.semester,
      },
      metrics: {
        totalStudents,
        studentsAtRisk,
        avgPerformance,
        improvementRate,
      },
      baseline: {
        latestPredictionRunId: latestRun?.publicId || null,
        latestPredictionAt: latestRun?.generatedAt || null,
        previousPredictionAt: previousRun?.generatedAt || null,
      },
    };
  }

  static async getClassesOverview(teacherId) {
    const formatClassLabel = (teacherClass) => {
      const semesterText = String(teacherClass.semester || "").trim();
      const sectionText = String(teacherClass.section || "").trim();

      if (semesterText && sectionText) {
        return `${semesterText} (Section ${sectionText})`;
      }

      if (semesterText) {
        return semesterText;
      }

      return teacherClass.name || "Class";
    };

    const predictionRuns = await prisma.predictionRun.findMany({
      where: {
        class: {
          teacherId,
        },
      },
      orderBy: [
        { generatedAt: "desc" },
        { id: "desc" },
      ],
      include: {
        class: {
          select: {
            id: true,
            publicId: true,
            name: true,
            semester: true,
            semesterNumber: true,
            section: true,
            _count: {
              select: {
                students: true,
              },
            },
          },
        },
        entries: {
          select: {
            predictedScore: true,
            riskLevel: true,
          },
        },
      },
      take: 120,
    });

    const runsByClass = new Map();
    for (const run of predictionRuns) {
      const classId = run.class?.id;
      if (!classId) {
        continue;
      }

      const existing = runsByClass.get(classId) || [];
      existing.push(run);
      runsByClass.set(classId, existing);
    }

    const selectedClassRuns = [];
    for (const run of predictionRuns) {
      const classId = run.class?.id;
      if (!classId) {
        continue;
      }

      if (selectedClassRuns.some((item) => item.class.id === classId)) {
        continue;
      }

      selectedClassRuns.push(run);
      if (selectedClassRuns.length === 3) {
        break;
      }
    }

    if (selectedClassRuns.length < 3) {
      const selectedClassIds = new Set(selectedClassRuns.map((run) => run.class.id));
      const missingClasses = await prisma.teacherClass.findMany({
        where: {
          teacherId,
          id: {
            notIn: Array.from(selectedClassIds),
          },
        },
        orderBy: [
          { updatedAt: "desc" },
          { id: "desc" },
        ],
        take: 3 - selectedClassRuns.length,
        select: {
          id: true,
          publicId: true,
          name: true,
          semester: true,
          semesterNumber: true,
          section: true,
          _count: {
            select: {
              students: true,
            },
          },
          students: {
            select: {
              semesterAvgScore: true,
              overallRiskLevel: true,
            },
          },
        },
      });

      for (const teacherClass of missingClasses) {
        selectedClassRuns.push({
          class: teacherClass,
          entries: [],
          generatedAt: null,
          publicId: null,
        });
      }
    }

    const classes = selectedClassRuns.map((run) => {
      const classRuns = runsByClass.get(run.class.id) || [];
      const latest = classRuns[0] || run;
      const previous = classRuns[1] || null;

      const latestEntries = Array.isArray(latest.entries) ? latest.entries : [];
      const latestAvg = latestEntries.length
        ? latestEntries.reduce((sum, entry) => sum + Number(entry.predictedScore || 0), 0) / latestEntries.length
        : null;
      const latestAtRisk = latestEntries.length
        ? latestEntries.filter((entry) => {
            const risk = String(entry.riskLevel || "").toUpperCase();
            return risk === "HIGH" || risk === "MID";
          }).length
        : null;

      let fallbackAvg = null;
      let fallbackAtRisk = null;
      if (!latestEntries.length && Array.isArray(run.class?.students) && run.class.students.length) {
        fallbackAvg = run.class.students.reduce((sum, student) => sum + Number(student.semesterAvgScore || 0), 0)
          / run.class.students.length;
        fallbackAtRisk = run.class.students.filter((student) => {
          const risk = String(student.overallRiskLevel || "").toUpperCase();
          return risk === "HIGH" || risk === "MID";
        }).length;
      }

      const previousEntries = Array.isArray(previous?.entries) ? previous.entries : [];
      const previousAvg = previousEntries.length
        ? previousEntries.reduce((sum, entry) => sum + Number(entry.predictedScore || 0), 0) / previousEntries.length
        : null;

      return {
        class: {
          id: run.class.publicId,
          name: formatClassLabel(run.class),
          semester: run.class.semester,
          semesterNumber: run.class.semesterNumber,
          section: run.class.section,
        },
        studentsEnrolled: Number(run.class?._count?.students || 0),
        avgScore: Number.isFinite(latestAvg)
          ? roundTo(latestAvg)
          : roundTo(fallbackAvg || 0),
        studentsAtRisk: Number.isFinite(latestAtRisk)
          ? latestAtRisk
          : Number(fallbackAtRisk || 0),
        latestPrediction: {
          id: latest.publicId || null,
          generatedAt: latest.generatedAt || null,
        },
        improvementRate: Number.isFinite(latestAvg) && Number.isFinite(previousAvg)
          ? roundTo(percentChange(latestAvg, previousAvg))
          : 0,
      };
    });

    const sortedByRecentPrediction = [...classes].sort((a, b) => {
      const timeA = a.latestPrediction.generatedAt ? new Date(a.latestPrediction.generatedAt).getTime() : 0;
      const timeB = b.latestPrediction.generatedAt ? new Date(b.latestPrediction.generatedAt).getTime() : 0;
      return timeB - timeA;
    });

    const recentActivity = [];

    const latestPredictedClass = sortedByRecentPrediction.find((item) => item.latestPrediction.generatedAt);
    if (latestPredictedClass) {
      recentActivity.push({
        type: "PREDICTION_COMPLETED",
        title: "Prediction Completed",
        description: `${latestPredictedClass.class.name} - ${latestPredictedClass.studentsEnrolled} students analyzed`,
        timestamp: latestPredictedClass.latestPrediction.generatedAt,
        timeAgo: formatRelativePredictionLabel(latestPredictedClass.latestPrediction.generatedAt),
      });
    }

    const highestRiskClass = [...classes]
      .sort((a, b) => b.studentsAtRisk - a.studentsAtRisk)
      .find((item) => item.studentsAtRisk > 0);

    if (highestRiskClass) {
      recentActivity.push({
        type: "RISK_ALERT",
        title: `${highestRiskClass.studentsAtRisk} Students At Risk`,
        description: `Alert: Declining performance detected in Class ${highestRiskClass.class.semesterNumber || ""}${highestRiskClass.class.section || ""}`,
        timestamp: highestRiskClass.latestPrediction.generatedAt,
        timeAgo: highestRiskClass.latestPrediction.generatedAt
          ? formatRelativePredictionLabel(highestRiskClass.latestPrediction.generatedAt)
          : "N/A",
      });
    }

    const improvedClass = [...classes]
      .sort((a, b) => b.improvementRate - a.improvementRate)
      .find((item) => item.improvementRate > 0);

    if (improvedClass) {
      recentActivity.push({
        type: "PERFORMANCE_IMPROVED",
        title: "Performance Improved",
        description: `Class ${improvedClass.class.semesterNumber || ""}${improvedClass.class.section || ""} showing +${roundTo(improvedClass.improvementRate)}% improvement this semester`,
        timestamp: improvedClass.latestPrediction.generatedAt,
        timeAgo: improvedClass.latestPrediction.generatedAt
          ? formatRelativePredictionLabel(improvedClass.latestPrediction.generatedAt)
          : "N/A",
      });
    }

    return {
      classes,
      recentActivity,
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

    const classStudents = await prisma.studentRecord.findMany({
      where: { classId: teacherClass.id },
      select: {
        id: true,
        publicId: true,
        name: true,
        regNo: true,
        quiz1: true,
        quiz2: true,
        quiz3: true,
        quiz4: true,
        quiz5: true,
        quiz6: true,
        assignment1: true,
        assignment2: true,
        assignment3: true,
        assignment4: true,
        assignment5: true,
        midsPercentage: true,
        attendancePercentage: true,
      },
    });

    const selectedStudents = payload.scope === "SELECTED"
      ? (() => {
          const selectionIds = new Set(
            (payload.studentIds || []).map((id) => String(id).trim())
          );

          if (!selectionIds.size) {
            throw new Error("studentIds is required for SELECTED scope");
          }

          const filtered = classStudents.filter((student) =>
            selectionIds.has(String(student.publicId).trim()) ||
            selectionIds.has(String(student.id).trim())
          );

          if (!filtered.length) {
            throw new Error("No selected students matched this class");
          }

          return filtered;
        })()
      : classStudents;

    if (!selectedStudents.length) {
      throw new Error("No students found in this class");
    }

    const flaskRequestStudents = selectedStudents.map((student) => ({
      student_id: student.publicId,
      course_name: String(teacherClass.courseName || teacherClass.subject || teacherClass.name || "").trim(),
      semester: String(teacherClass.semester || "").trim(),
      q1: toFiniteNumber(student.quiz1),
      q2: toFiniteNumber(student.quiz2),
      q3: toFiniteNumber(student.quiz3),
      q4: toFiniteNumber(student.quiz4),
      q5: toFiniteNumber(student.quiz5),
      q6: toFiniteNumber(student.quiz6),
      a1: toFiniteNumber(student.assignment1),
      a2: toFiniteNumber(student.assignment2),
      a3: toFiniteNumber(student.assignment3),
      a4: toFiniteNumber(student.assignment4),
      a5: toFiniteNumber(student.assignment5),
      a6: null,
      mids: toFiniteNumber(student.midsPercentage, 0),
      attendance: toFiniteNumber(student.attendancePercentage, 0),
    }));

    let flaskPayload;
    try {
      flaskPayload = await fetchFlaskPredictions(flaskRequestStudents, teacherClass);
    } catch (flaskError) {
      throw new Error(`Prediction service unavailable: ${flaskError instanceof Error ? flaskError.message : "Flask did not respond"}`);
    }

    const succeeded = Number(flaskPayload.succeeded ?? flaskPayload.predictions?.length ?? 0);
    const failed = Number(flaskPayload.failed ?? 0);
    const hasResults = Array.isArray(flaskPayload.predictions) && flaskPayload.predictions.length > 0;

    if (!hasResults || succeeded === 0) {
      const errorLines = (flaskPayload.errors || [])
        .flatMap((e) => Array.isArray(e.errors) ? e.errors : [String(e)])
        .slice(0, 5);
      const detail = errorLines.length ? `: ${errorLines.join("; ")}` : "";
      throw new Error(`Prediction failed — Flask returned no results${detail}`);
    }

    if (failed > 0) {
      const errorLines = (flaskPayload.errors || [])
        .flatMap((e) => Array.isArray(e.errors) ? e.errors : [String(e)])
        .slice(0, 5);
      const detail = errorLines.length ? `: ${errorLines.join("; ")}` : "";
      throw new Error(`Prediction partially failed (${failed} of ${succeeded + failed} students)${detail}`);
    }

    const normalizedPredictions = mapFlaskPredictionResults(flaskPayload, selectedStudents);

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
          programCode: teacherClass.programCode,
          semesterNumber: teacherClass.semesterNumber,
          section: teacherClass.section,
          courseCode: teacherClass.courseCode,
          courseName: teacherClass.courseName,
        },
      });

      const reportCode = `RPT-${predictionRun.id}`;
      const updatedPredictionRun = await tx.predictionRun.update({
        where: { id: predictionRun.id },
        data: { reportCode },
      });

      await tx.predictionEntry.createMany({
        data: entryData.map((entry) => ({
          publicId: createId(),
          ...entry,
          predictionRunId: predictionRun.id,
        })),
      });

      await this.refreshSemesterStudentAnalyticsFromPredictions(teacherClass.semester, { tx });

      const entries = await tx.predictionEntry.findMany({
        where: { predictionRunId: predictionRun.id },
        orderBy: { predictedScore: "desc" },
        include: {
          studentRecord: {
            select: {
              publicId: true,
              expectedCgpa: true,
              classRank: true,
              overallRiskLevel: true,
              semesterAvgScore: true,
            },
          },
        },
      });

      return {
        predictionApiResponse: flaskPayload,
        prediction: {
          id: updatedPredictionRun.publicId,
          reportId: updatedPredictionRun.reportCode,
          title: updatedPredictionRun.title,
          scope: updatedPredictionRun.scope,
          classMetadata: {
            programCode: updatedPredictionRun.programCode,
            semesterNumber: updatedPredictionRun.semesterNumber,
            section: updatedPredictionRun.section,
            courseCode: updatedPredictionRun.courseCode,
            courseName: updatedPredictionRun.courseName,
          },
          generatedAt: updatedPredictionRun.generatedAt,
          createdAt: updatedPredictionRun.createdAt,
          updatedAt: updatedPredictionRun.updatedAt,
        },
        count: entries.length,
        entries: entries.map((entry) => ({
          id: entry.publicId,
          studentId: entry.studentRecord?.publicId || null,
          name: entry.studentName,
          regNo: entry.regNo,
          predictedScore: entry.predictedScore,
          performance: entry.performance,
          passProbability: entry.passProbability,
          modelConfidence: entry.modelConfidence,
          riskLevel: entry.riskLevel,
          expectedCgpa: entry.studentRecord?.expectedCgpa || null,
          classRank: entry.studentRecord?.classRank || null,
          overallRiskLevel: entry.studentRecord?.overallRiskLevel || null,
          semesterAvgScore: entry.studentRecord?.semesterAvgScore || null,
          suggestions: entry.suggestions,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
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

    const result = await prisma.$transaction(async (tx) => {
      const updateData = {};

      const mergedClassData = {
        ...teacherClass,
        ...classData,
      };
      const classMetadata = await this.resolveClassMetadata(mergedClassData, tx);

      if (classData.name !== undefined && classData.name !== null) {
        updateData.name = classMetadata.programName;
      }
      if (classData.subject !== undefined) {
        updateData.subject = classMetadata.subject;
      }
      if (classData.section !== undefined) {
        updateData.section = classData.section || null;
      }
      if (classData.semester !== undefined) {
        updateData.semester = classMetadata.semester;
      }

      updateData.name = classMetadata.programName;
      updateData.programCode = classMetadata.programCode;
      updateData.programName = classMetadata.programName;
      updateData.courseCode = classMetadata.courseCode;
      updateData.courseName = classMetadata.courseName;
      updateData.courseCatalogId = classMetadata.courseCatalogId;
      updateData.semesterNumber = classMetadata.semesterNumber;
      updateData.subject = classMetadata.subject;
      updateData.semester = classMetadata.semester;

      const classUpdateResult = await tx.teacherClass.update({
        where: { id: teacherClass.id },
        data: Object.keys(updateData).length ? updateData : {},
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
              phoneNumber: student.phoneNumber,
              address: student.address,
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
              email: student.email,
              phoneNumber: student.phoneNumber,
              address: student.address,
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

      const createdStudentsOnly = upsertedStudents.filter((s) => !existingIds.has(s.id));

      return {
        class: this.formatTeacherClassResponse(classUpdateResult),
        studentsDeleted: studentsToDelete.length,
        studentsAdded: upsertedStudents.filter((s) => !existingIds.has(s.id)).length,
        studentsUpdated: upsertedStudents.filter((s) => existingIds.has(s.id)).length,
        students: updatedStudents.map((student) => ({
          ...student,
          id: student.publicId,
        })),
        newStudents: createdStudentsOnly,
      };
    }, { timeout: 15000, maxWait: 10000 });

    await this.ensureStudentUsersExist(result.newStudents || []);
    const { newStudents, ...response } = result;
    return response;
  }

  static async upsertStudent(classId, teacherId, studentData) {
    const teacherClass = await this.assertTeacherClass(classId, teacherId);
    const normalized = this.normalizeStudentRow(studentData);

    const existing = await prisma.studentRecord.findUnique({
      where: {
        classId_regNo: {
          classId: teacherClass.id,
          regNo: normalized.regNo,
        },
      },
    });

    let student;
    if (existing) {
      student = await prisma.studentRecord.update({
        where: { id: existing.id },
        data: {
          name: normalized.name,
          phoneNumber: normalized.phoneNumber,
          address: normalized.address,
          quiz1: normalized.quiz1,
          quiz2: normalized.quiz2,
          quiz3: normalized.quiz3,
          quiz4: normalized.quiz4,
          quiz5: normalized.quiz5,
          quiz6: normalized.quiz6,
          assignment1: normalized.assignment1,
          assignment2: normalized.assignment2,
          assignment3: normalized.assignment3,
          assignment4: normalized.assignment4,
          assignment5: normalized.assignment5,
          midsPercentage: normalized.midsPercentage,
          attendancePercentage: normalized.attendancePercentage,
        },
      });
    } else {
      student = await prisma.studentRecord.create({
        data: {
          publicId: createId(),
          classId: teacherClass.id,
          ...normalized,
        },
      });

      await this.ensureStudentUsersExist([student]);
    }

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

    return prisma.$transaction(async (tx) => {
      const normalizedRows = students.map((student) => this.normalizeStudentRow(student));
      const results = [];
      const createdStudents = [];

      for (const normalized of normalizedRows) {
        const existing = await tx.studentRecord.findUnique({
          where: {
            classId_regNo: {
              classId: teacherClass.id,
              regNo: normalized.regNo,
            },
          },
        });

        if (existing) {
          const updated = await tx.studentRecord.update({
            where: { id: existing.id },
            data: {
              name: normalized.name,
              phoneNumber: normalized.phoneNumber,
              address: normalized.address,
              quiz1: normalized.quiz1,
              quiz2: normalized.quiz2,
              quiz3: normalized.quiz3,
              quiz4: normalized.quiz4,
              quiz5: normalized.quiz5,
              quiz6: normalized.quiz6,
              assignment1: normalized.assignment1,
              assignment2: normalized.assignment2,
              assignment3: normalized.assignment3,
              assignment4: normalized.assignment4,
              assignment5: normalized.assignment5,
              midsPercentage: normalized.midsPercentage,
              attendancePercentage: normalized.attendancePercentage,
            },
          });
          results.push(updated);
        } else {
          const created = await tx.studentRecord.create({
            data: {
              publicId: createId(),
              classId: teacherClass.id,
              ...normalized,
            },
          });
          createdStudents.push(created);
          results.push(created);
        }
      }

      await this.ensureStudentUsersExist(createdStudents, { tx });

      return results.map((student) => ({
        ...student,
        id: student.publicId,
      }));
    });
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
      id: student.publicId,
      studentId: student.publicId,
      studentIdInt: student.id,
      name: student.name,
      regNo: student.regNo,
      email: student.email,
      phoneNumber: student.phoneNumber,
      address: student.address,
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
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
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
