import { Router } from "express";
import multer from "multer";
import { authenticate, authorizeRoles } from "../../auth/middlewares/auth.js";
import { TeacherController } from "../controllers/teacher.controller.js";
import { teacherValidation } from "../validations/teacher.validation.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const validateBody = (schema) => (req, res, next) => {
  const body = req.body;

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({
      success: false,
      message: "Request body must be a valid JSON object",
    });
  }

  const { error, value } = schema.validate(body, {
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

  req.body = value;
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

router.get(
  "/students/:studentId/details",
  authenticate,
  authorizeRoles("TEACHER", "ADMIN"),
  validateParams(teacherValidation.studentIdParam),
  validateQuery(teacherValidation.studentDetailsQuery),
  TeacherController.getStudentDetails
);
router.get(
  "/students/:studentId/subject-performance",
  authenticate,
  authorizeRoles("TEACHER", "ADMIN"),
  validateParams(teacherValidation.studentIdParam),
  validateQuery(teacherValidation.studentSubjectPerformanceQuery),
  TeacherController.getStudentSubjectPerformance
);
router.get(
  "/students/:studentId/performance-overview",
  authenticate,
  authorizeRoles("TEACHER", "ADMIN"),
  validateParams(teacherValidation.studentIdParam),
  validateQuery(teacherValidation.studentPerformanceOverviewQuery),
  TeacherController.getStudentPerformanceOverview
);
router.get(
  "/students/:studentId/latest-predictions",
  authenticate,
  authorizeRoles("TEACHER", "ADMIN"),
  validateParams(teacherValidation.studentIdParam),
  validateQuery(teacherValidation.studentLatestPredictionsQuery),
  TeacherController.getStudentLatestPredictions
);
router.get(
  "/students/:studentId/recommendations",
  authenticate,
  authorizeRoles("TEACHER", "ADMIN"),
  validateParams(teacherValidation.studentIdParam),
  validateQuery(teacherValidation.studentRecommendationsQuery),
  TeacherController.getStudentRecommendations
);
router.get(
  "/catalog/programs",
  authenticate,
  authorizeRoles("TEACHER", "ADMIN"),
  TeacherController.getCatalogPrograms
);
router.get(
  "/catalog/class-names",
  authenticate,
  authorizeRoles("TEACHER", "ADMIN"),
  TeacherController.getCatalogPrograms
);
router.get(
  "/catalog/semesters",
  authenticate,
  authorizeRoles("TEACHER", "ADMIN"),
  validateQuery(teacherValidation.catalogSemestersQuery),
  TeacherController.getCatalogSemesters
);
router.get(
  "/catalog/subjects",
  authenticate,
  authorizeRoles("TEACHER", "ADMIN"),
  validateQuery(teacherValidation.catalogSubjectsQuery),
  TeacherController.getCatalogSubjects
);

router.use(authenticate, authorizeRoles("TEACHER"));

router.post(
  "/new-class-with-students",
  validateBody(teacherValidation.createClassWithStudents),
  TeacherController.createClassWithStudents
);
router.put(
  "/classes/:classId",
  validateParams(teacherValidation.classIdParam),
  validateBody(teacherValidation.updateClassWithStudents),
  TeacherController.updateClassWithStudents
);
router.post("/classes", validateBody(teacherValidation.createClass), TeacherController.createClass);
router.get("/classes", TeacherController.getClasses);
router.get("/classes/names", TeacherController.getClassNames);
router.get(
  "/classes/:classId/performance-overview",
  validateParams(teacherValidation.classIdParam),
  TeacherController.getClassPerformanceOverview
);
router.get("/classes/:classId", validateParams(teacherValidation.classIdParam), TeacherController.getClassDetails);
router.delete("/classes/:classId", validateParams(teacherValidation.classIdParam), TeacherController.deleteClass);
router.get("/classes/:classId/students", validateParams(teacherValidation.classIdParam), TeacherController.getClassStudents);
router.get(
  "/classes/:classId/students/prediction-status",
  validateParams(teacherValidation.classIdParam),
  TeacherController.getClassStudentsPredictionStatus
);
router.get(
  "/predictions/metrics",
  TeacherController.getPredictionMetrics
);
router.get(
  "/predictions/reports",
  validateQuery(teacherValidation.predictionReportsQuery),
  TeacherController.getPredictionReports
);
router.get(
  "/students/:studentId/predictions",
  validateParams(teacherValidation.studentIdParam),
  TeacherController.getStudentPredictions
);
router.get(
  "/predictions/:predictionId/students/:studentId",
  validateParams(teacherValidation.predictionStudentParams),
  TeacherController.getStudentPredictionDetails
);
router.get(
  "/predictions/history",
  validateQuery(teacherValidation.predictionHistoryQuery),
  TeacherController.getPredictionHistory
);
router.get(
  "/classes/:classId/predictions/:predictionId",
  validateParams(teacherValidation.classPredictionParams),
  TeacherController.getPredictionDetails
);
router.post(
  "/classes/:classId/predictions",
  validateParams(teacherValidation.classIdParam),
  validateBody(teacherValidation.predictionSave),
  TeacherController.savePrediction
);
router.post(
  "/classes/:classId/students",
  validateParams(teacherValidation.classIdParam),
  validateBody(teacherValidation.studentRow),
  TeacherController.addStudent
);
router.post(
  "/classes/:classId/students/bulk",
  validateParams(teacherValidation.classIdParam),
  validateBody(teacherValidation.bulkRows),
  TeacherController.addStudentsBulk
);
router.post(
  "/classes/:classId/students/upload-excel",
  validateParams(teacherValidation.classIdParam),
  upload.single("file"),
  TeacherController.uploadStudentsExcel
);

export default router;