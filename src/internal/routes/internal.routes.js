import { Router } from "express";
import { TeacherController } from "../../teacher/controllers/teacher.controller.js";
import { teacherValidation } from "../../teacher/validations/teacher.validation.js";

const router = Router();

const validateParams = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.params, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: error.details.map((item) => item.message),
    });
  }

  req.params = value;
  return next();
};

const validateQuery = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: error.details.map((item) => item.message),
    });
  }

  req.validatedQuery = value;
  return next();
};

const validateInternalSecret = (req, res, next) => {
  const expectedSecret = process.env.INTERNAL_API_SECRET;

  if (!expectedSecret) {
    return res.status(500).json({
      success: false,
      message: "Internal API secret is not configured",
    });
  }

  const providedSecret = String(req.header("x-internal-secret") || "").trim();

  if (!providedSecret || providedSecret !== expectedSecret) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized internal request",
    });
  }

  return next();
};

router.get(
  "/students/:studentId/history",
  validateInternalSecret,
  validateParams(teacherValidation.studentIdParam),
  validateQuery(teacherValidation.studentHistoryQuery),
  TeacherController.getStudentHistory
);

export default router;