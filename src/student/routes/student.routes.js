import { Router } from "express";
import { authenticate, authorizeRoles } from "../../auth/middlewares/auth.js";
import { StudentController } from "../controllers/student.controller.js";
import { teacherValidation } from "../../teacher/validations/teacher.validation.js";

const router = Router();

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

router.get(
  "/dashboard/metrics",
  authenticate,
  authorizeRoles("STUDENT"),
  StudentController.getMyDashboardMetrics
);

router.get(
  "/details",
  authenticate,
  authorizeRoles("STUDENT"),
  validateQuery(teacherValidation.studentDetailsQuery),
  StudentController.getMyDetails
);

router.get(
  "/subject-performance",
  authenticate,
  authorizeRoles("STUDENT"),
  validateQuery(teacherValidation.studentSubjectPerformanceQuery),
  StudentController.getMySubjectPerformance
);

router.get(
  "/performance-overview",
  authenticate,
  authorizeRoles("STUDENT"),
  validateQuery(teacherValidation.studentPerformanceOverviewQuery),
  StudentController.getMyPerformanceOverview
);

router.get(
  "/latest-predictions",
  authenticate,
  authorizeRoles("STUDENT"),
  validateQuery(teacherValidation.studentLatestPredictionsQuery),
  StudentController.getMyLatestPredictions
);

router.get(
  "/history",
  authenticate,
  authorizeRoles("STUDENT"),
  validateQuery(teacherValidation.studentHistoryQuery),
  StudentController.getMyHistory
);

router.get(
  "/recommendations",
  authenticate,
  authorizeRoles("STUDENT"),
  validateQuery(teacherValidation.studentRecommendationsQuery),
  StudentController.getMyRecommendations
);

export default router;
