import Joi from "joi";

const scoreSchema = Joi.number().min(0).max(100).allow(null);

export const teacherValidation = {
  createClass: Joi.object({
    name: Joi.string().trim().min(1).max(150).required(),
    code: Joi.string().trim().max(50).allow(null, ""),
    section: Joi.string().trim().max(50).allow(null, ""),
    semester: Joi.string().trim().max(50).allow(null, ""),
  }),

  classIdParam: Joi.object({
    classId: Joi.number().integer().positive().required(),
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
      id: Joi.number().integer().optional(),
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
};
