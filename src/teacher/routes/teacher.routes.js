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
router.get("/classes/:classId", validateParams(teacherValidation.classIdParam), TeacherController.getClassDetails);
router.delete("/classes/:classId", validateParams(teacherValidation.classIdParam), TeacherController.deleteClass);
router.get("/classes/:classId/students", validateParams(teacherValidation.classIdParam), TeacherController.getClassStudents);
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
