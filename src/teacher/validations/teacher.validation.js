import Joi from "joi";

const scoreSchema = Joi.number().min(0).max(100).allow(null);
const idSchema = Joi.alternatives().try(
  Joi.string().trim().pattern(/^[a-zA-Z0-9_-]{6,}$/),
  Joi.string().trim().pattern(/^\d+$/)
).required();

const optionalIdSchema = Joi.alternatives().try(
  Joi.string().trim().pattern(/^[a-zA-Z0-9_-]{6,}$/),
  Joi.string().trim().pattern(/^\d+$/)
);

const optionalStudentEmail = Joi.string().trim().email({ tlds: { allow: false } }).allow(null, "");
const optionalStudentPhone = Joi.string().trim().max(30).allow(null, "");
const optionalStudentAddress = Joi.string().trim().max(500).allow(null, "");
const flaskPredictionScore = Joi.number().min(0).max(100).required();
const flaskPredictionStudent = Joi.object({
  student_id: idSchema,
  course_name: Joi.string().trim().min(1).max(150).required(),
  semester: Joi.string().trim().min(1).max(50).required(),
  q1: flaskPredictionScore,
  q2: flaskPredictionScore,
  q3: flaskPredictionScore,
  q4: flaskPredictionScore,
  q5: flaskPredictionScore,
  q6: flaskPredictionScore,
  a1: flaskPredictionScore,
  a2: flaskPredictionScore,
  a3: flaskPredictionScore,
  a4: flaskPredictionScore,
  a5: flaskPredictionScore,
  a6: flaskPredictionScore,
  mids: flaskPredictionScore,
  attendance: flaskPredictionScore,
});

export const teacherValidation = {
  createClass: Joi.object({
    name: Joi.string().trim().min(1).max(150).optional(),
    programCode: Joi.string().trim().uppercase().max(20).optional(),
    programName: Joi.string().trim().max(150).optional(),
    courseCode: Joi.string().trim().max(50).optional(),
    courseName: Joi.string().trim().max(150).optional(),
    subject: Joi.string().trim().max(150).allow(null, ""),
    section: Joi.string().trim().max(50).allow(null, ""),
    semester: Joi.string().trim().max(50).allow(null, ""),
    semesterNumber: Joi.number().integer().min(1).max(8).optional(),
    courseCatalogId: optionalIdSchema.optional(),
  }),

  classIdParam: Joi.object({
    classId: idSchema,
  }),

  classPredictionParams: Joi.object({
    classId: idSchema,
    predictionId: idSchema,
  }),

  classStudentPredictionComparisonParams: Joi.object({
    classId: idSchema,
    studentId: idSchema,
  }),

  studentIdParam: Joi.object({
    studentId: idSchema,
  }),

  predictionStudentParams: Joi.object({
    predictionId: idSchema,
    studentId: idSchema,
  }),

  studentRow: Joi.object({
    name: Joi.string().trim().min(1).max(150).required(),
    regNo: Joi.string().trim().min(1).max(100).required(),
    email: optionalStudentEmail,
    phoneNumber: optionalStudentPhone,
    address: optionalStudentAddress,
    quiz1: scoreSchema,
    quiz2: scoreSchema,
    quiz3: scoreSchema,
    quiz4: scoreSchema,
    quiz5: scoreSchema,
    quiz6: scoreSchema,
    assignment1: scoreSchema,
    assignment2: scoreSchema,
    assignment3: scoreSchema,
    assignment4: scoreSchema,
    assignment5: scoreSchema,
    midsPercentage: scoreSchema,
    attendancePercentage: scoreSchema,
  }),

  bulkRows: Joi.object({
    students: Joi.array().items(Joi.object({
      name: Joi.string().trim().min(1).max(150).required(),
      regNo: Joi.string().trim().min(1).max(100).required(),
      email: optionalStudentEmail,
      phoneNumber: optionalStudentPhone,
      address: optionalStudentAddress,
      quiz1: scoreSchema,
      quiz2: scoreSchema,
      quiz3: scoreSchema,
      quiz4: scoreSchema,
      quiz5: scoreSchema,
      quiz6: scoreSchema,
      assignment1: scoreSchema,
      assignment2: scoreSchema,
      assignment3: scoreSchema,
      assignment4: scoreSchema,
      assignment5: scoreSchema,
      midsPercentage: scoreSchema,
      attendancePercentage: scoreSchema,
    })).min(1).required(),
  }),

  createClassWithStudents: Joi.object({
    class: Joi.object({
      name: Joi.string().trim().min(1).max(150).optional(),
      programCode: Joi.string().trim().uppercase().max(20).optional(),
      programName: Joi.string().trim().max(150).optional(),
      courseCode: Joi.string().trim().max(50).optional(),
      courseName: Joi.string().trim().max(150).optional(),
      subject: Joi.string().trim().max(150).allow(null, ""),
      section: Joi.string().trim().max(50).allow(null, ""),
      semester: Joi.string().trim().max(50).allow(null, ""),
      semesterNumber: Joi.number().integer().min(1).max(8).optional(),
      courseCatalogId: optionalIdSchema.optional(),
    }).required(),
    students: Joi.array().items(Joi.object({
      name: Joi.string().trim().min(1).max(150).required(),
      regNo: Joi.string().trim().min(1).max(100).required(),
      email: optionalStudentEmail,
      phoneNumber: optionalStudentPhone,
      address: optionalStudentAddress,
      quiz1: scoreSchema,
      quiz2: scoreSchema,
      quiz3: scoreSchema,
      quiz4: scoreSchema,
      quiz5: scoreSchema,
      quiz6: scoreSchema,
      assignment1: scoreSchema,
      assignment2: scoreSchema,
      assignment3: scoreSchema,
      assignment4: scoreSchema,
      assignment5: scoreSchema,
      midsPercentage: scoreSchema,
      attendancePercentage: scoreSchema,
    })).min(1).required(),
  }),

  updateClassWithStudents: Joi.object({
    class: Joi.object({
      name: Joi.string().trim().min(1).max(150).optional(),
      programCode: Joi.string().trim().uppercase().max(20).optional(),
      programName: Joi.string().trim().max(150).optional(),
      courseCode: Joi.string().trim().max(50).optional(),
      courseName: Joi.string().trim().max(150).optional(),
      subject: Joi.string().trim().max(150).allow(null, "").optional(),
      section: Joi.string().trim().max(50).allow(null, "").optional(),
      semester: Joi.string().trim().max(50).allow(null, "").optional(),
      semesterNumber: Joi.number().integer().min(1).max(8).optional(),
      courseCatalogId: optionalIdSchema.optional(),
    }).required(),
    students: Joi.array().items(Joi.object({
      id: optionalIdSchema.optional(),
      name: Joi.string().trim().min(1).max(150).required(),
      regNo: Joi.string().trim().min(1).max(100).required(),
      email: optionalStudentEmail,
      phoneNumber: optionalStudentPhone,
      address: optionalStudentAddress,
      quiz1: scoreSchema,
      quiz2: scoreSchema,
      quiz3: scoreSchema,
      quiz4: scoreSchema,
      quiz5: scoreSchema,
      quiz6: scoreSchema,
      assignment1: scoreSchema,
      assignment2: scoreSchema,
      assignment3: scoreSchema,
      assignment4: scoreSchema,
      assignment5: scoreSchema,
      midsPercentage: scoreSchema,
      attendancePercentage: scoreSchema,
    })).min(0).required(),
  }),

  predictionSave: Joi.object({
    predictionName: Joi.string().trim().min(1).max(150).optional(),
    scope: Joi.string().valid("CLASS", "SELECTED").required(),
    predictions: Joi.array().items(Joi.object({
      studentId: optionalIdSchema.optional(),
      name: Joi.string().trim().min(1).max(150).required(),
      regNo: Joi.string().trim().min(1).max(100).required(),
      predictedScore: Joi.number().min(0).max(100).required(),
      performance: Joi.string().valid("LOW", "AVG", "HIGH").required(),
      passProbability: Joi.number().min(0).max(1).required(),
      modelConfidence: Joi.number().min(0).max(1).required(),
      riskLevel: Joi.string().valid("LOW", "MID", "HIGH").required(),
      suggestions: Joi.alternatives().try(
        Joi.array().items(Joi.string().trim().min(1).max(500)).min(1),
        Joi.string().trim().min(1).max(2000)
      ).required(),
    })).min(1).required(),
  }),

  predictionHistoryQuery: Joi.object({
    scope: Joi.string().trim().uppercase().valid("CLASS", "SELECTED").default("CLASS"),
    studentId: optionalIdSchema.optional(),
  }),

  predictionReportsQuery: Joi.object({
    classId: optionalIdSchema.optional(),
    scope: Joi.string().trim().uppercase().valid("CLASS", "SELECTED").optional(),
    avgScoreMin: Joi.number().min(0).max(100).optional(),
    avgScoreMax: Joi.number().min(0).max(100).optional(),
  }),

  studentDetailsQuery: Joi.object({
    semester: Joi.string().trim().max(50).optional(),
  }),

  studentSubjectPerformanceQuery: Joi.object({
    semester: Joi.string().trim().max(50).optional(),
  }),

  studentPerformanceOverviewQuery: Joi.object({
    semester: Joi.string().trim().max(50).optional(),
  }),

  studentLatestPredictionsQuery: Joi.object({
    semester: Joi.string().trim().max(50).optional(),
  }),

  studentHistoryQuery: Joi.object({
    semester: Joi.string().trim().max(50).optional(),
  }),

  studentHistoryBulkBody: Joi.object({
    studentIds: Joi.array().items(idSchema).min(1).required().unique(),
    semester: Joi.string().trim().max(50).optional(),
  }),

  studentRecommendationsQuery: Joi.object({
    semester: Joi.string().trim().max(50).optional(),
  }),

  catalogSemestersQuery: Joi.object({
    programCode: Joi.string().trim().uppercase().max(20).required(),
  }),

  catalogSubjectsQuery: Joi.object({
    programCode: Joi.string().trim().uppercase().max(20).required(),
    semesterNumber: Joi.number().integer().min(1).max(8).required(),
  }),
};