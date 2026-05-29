import { TeacherService } from "../../teacher/services/teacher.service.js";

export class StudentController {
  static async getMyDashboardMetrics(req, res) {
    try {
      const actor = {
        userId: req.user.userId,
        role: req.user.role,
      };

      const data = await TeacherService.getStudentDashboardMetrics(actor);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch dashboard metrics",
      });
    }
  }

  static async getMyDetails(req, res) {
    try {
      const filters = req.validatedQuery || req.query;
      const actor = {
        userId: req.user.userId,
        role: req.user.role,
      };

      const data = await TeacherService.getSelfStudentDetails(actor, filters);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch student details",
      });
    }
  }

  static async getMySubjectPerformance(req, res) {
    try {
      const filters = req.validatedQuery || req.query;
      const actor = {
        userId: req.user.userId,
        role: req.user.role,
      };

      const data = await TeacherService.getSelfStudentSubjectPerformance(actor, filters);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch subject performance",
      });
    }
  }

  static async getMyPerformanceOverview(req, res) {
    try {
      const filters = req.validatedQuery || req.query;
      const actor = {
        userId: req.user.userId,
        role: req.user.role,
      };

      const data = await TeacherService.getSelfStudentPerformanceOverview(actor, filters);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch performance overview",
      });
    }
  }

  static async getMyLatestPredictions(req, res) {
    try {
      const filters = req.validatedQuery || req.query;
      const actor = {
        userId: req.user.userId,
        role: req.user.role,
      };

      const data = await TeacherService.getSelfStudentLatestPredictions(actor, filters);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch latest predictions",
      });
    }
  }

  static async getMyHistory(req, res) {
    try {
      const filters = req.validatedQuery || req.query;
      const actor = {
        userId: req.user.userId,
        role: req.user.role,
      };

      const data = await TeacherService.getSelfStudentHistory(actor, filters);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch student history",
      });
    }
  }

  static async getMyRecommendations(req, res) {
    try {
      const filters = req.validatedQuery || req.query;
      const actor = {
        userId: req.user.userId,
        role: req.user.role,
      };

      const data = await TeacherService.getSelfStudentRecommendations(actor, filters);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch recommendations",
      });
    }
  }
}
