import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { authenticate, authorizeRoles } from "../middlewares/auth.js";
import { authValidation } from "../validations/auth.validation.js";

const router = Router();

const validateBody = (schema) => (req, res, next) => {
  const body = req.body;

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({
      success: false,
      message: "Request body must be a valid JSON object",
    });
  }

  const { error, value } = schema.validate(body, { abortEarly: false, stripUnknown: true });
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

router.post("/login", validateBody(authValidation.login), AuthController.login);
router.post("/refresh-token", validateBody(authValidation.refreshToken), AuthController.refreshToken);
router.post("/forgot-password", validateBody(authValidation.forgotPassword), AuthController.forgotPassword);
router.post("/logout", validateBody(authValidation.logout), AuthController.logout);

router.get("/me", authenticate, AuthController.me);
router.get("/student-only", authenticate, authorizeRoles("STUDENT"), (_req, res) => {
  return res.status(200).json({ success: true, message: "Student route access granted" });
});
router.get("/teacher-only", authenticate, authorizeRoles("TEACHER"), (_req, res) => {
  return res.status(200).json({ success: true, message: "Teacher route access granted" });
});
router.get("/admin-only", authenticate, authorizeRoles("ADMIN"), (_req, res) => {
  return res.status(200).json({ success: true, message: "Admin route access granted" });
});

export default router;
