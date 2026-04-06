import Joi from "joi";

const scoreSchema = Joi.number().min(0).max(100).allow(null);
const idSchema = Joi.alternatives().try(
  Joi.string().trim().pattern(/^[a-z0-9]{10,}$/),
  Joi.string().trim().pattern(/^\d+$/)
).required();

const optionalIdSchema = Joi.alternatives().try(
  Joi.string().trim().pattern(/^[a-z0-9]{10,}$/),
  Joi.string().trim().pattern(/^\d+$/)
);

export const teacherValidation = {
  createClass: Joi.object({
    name: Joi.string().trim().min(1).max(150).required(),
    code: Joi.string().trim().max(50).allow(null, ""),
    section: Joi.string().trim().max(50).allow(null, ""),
    semester: Joi.string().trim().max(50).allow(null, ""),
  }),

  classIdParam: Joi.object({
    classId: idSchema,
  }),

  classPredictionParams: Joi.object({
    classId: idSchema,
    predictionId: idSchema,
  }),

  studentRow: Joi.object({
    name: Joi.string().trim().min(1).max(150).required(),
    regNo: Joi.string().trim().min(1).max(100).required(),
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
      name: Joi.string().trim().min(1).max(150).required(),
      code: Joi.string().trim().max(50).allow(null, ""),
      section: Joi.string().trim().max(50).allow(null, ""),
      semester: Joi.string().trim().max(50).allow(null, ""),
    }).required(),
    students: Joi.array().items(Joi.object({
      name: Joi.string().trim().min(1).max(150).required(),
      regNo: Joi.string().trim().min(1).max(100).required(),
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
      code: Joi.string().trim().max(50).allow(null, "").optional(),
      section: Joi.string().trim().max(50).allow(null, "").optional(),
      semester: Joi.string().trim().max(50).allow(null, "").optional(),
    }).required(),
    students: Joi.array().items(Joi.object({
      id: optionalIdSchema.optional(),
      name: Joi.string().trim().min(1).max(150).required(),
      regNo: Joi.string().trim().min(1).max(100).required(),
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
};