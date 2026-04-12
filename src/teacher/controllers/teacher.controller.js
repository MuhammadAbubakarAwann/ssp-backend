import { TeacherService } from "../services/teacher.service.js";

export class TeacherController {
  static async createClassWithStudents(req, res) {
    try {
      const teacherId = req.user.userId;
      const result = await TeacherService.createClassWithStudents(
        req.body.class,
        req.body.students,
        teacherId
      );

      return res.status(201).json({
        success: true,
        message: "Class and students saved successfully",
        data: result,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to save class data",
      });
    }
  }

  static async updateClassWithStudents(req, res) {
    try {
      const teacherId = req.user.userId;
      const classId = req.params.classId;
      const result = await TeacherService.updateClassWithStudents(
        classId,
        req.body.class,
        req.body.students,
        teacherId
      );

      return res.status(200).json({
        success: true,
        message: "Class and students updated successfully",
        data: result,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to update class data",
      });
    }
  }

  static async createClass(req, res) {
    try {
      const teacherId = req.user.userId;
      const teacherClass = await TeacherService.createClass(req.body, teacherId);

      return res.status(201).json({
        success: true,
        message: "Class created successfully",
        data: { class: teacherClass },
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to create class",
      });
    }
  }

  static async getClasses(req, res) {
    try {
      const teacherId = req.user.userId;
      const classes = await TeacherService.getClasses(teacherId);

      return res.status(200).json({
        success: true,
        data: { classes },
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch classes",
      });
    }
  }

  static async getClassNames(req, res) {
    try {
      const teacherId = req.user.userId;
      const classes = await TeacherService.getClassNames(teacherId);

      return res.status(200).json({
        success: true,
        data: { classes },
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch class names",
      });
    }
  }

  static async getClassStudentsPredictionStatus(req, res) {
    try {
      const teacherId = req.user.userId;
      const classId = req.params.classId;

      if (classId === "0") {
        return res.status(200).json({
          success: true,
          data: {
            class: null,
            students: [],
          },
        });
      }

      const data = await TeacherService.getClassStudentsPredictionStatus(classId, teacherId);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch class students prediction status",
      });
    }
  }

  static async getPredictionHistory(req, res) {
    try {
      const teacherId = req.user.userId;
      const filters = req.validatedQuery || req.query;
      const data = await TeacherService.getPredictionHistory(teacherId, filters);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch prediction history",
      });
    }
  }

  static async getPredictionMetrics(req, res) {
    try {
      const teacherId = req.user.userId;
      const data = await TeacherService.getPredictionMetrics(teacherId);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch prediction metrics",
      });
    }
  }

  static async getPredictionReports(req, res) {
    try {
      const teacherId = req.user.userId;
      const filters = req.validatedQuery || req.query;
      const data = await TeacherService.getPredictionReports(teacherId, filters);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch prediction reports",
      });
    }
  }

  static async getStudentPredictions(req, res) {
    try {
      const teacherId = req.user.userId;
      const studentId = req.params.studentId;
      const data = await TeacherService.getStudentPredictions(studentId, teacherId);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch student predictions",
      });
    }
  }

  static async getStudentDetails(req, res) {
    try {
      const studentId = req.params.studentId;
      const filters = req.validatedQuery || req.query;
      const actor = {
        userId: req.user.userId,
        role: req.user.role,
      };
      const data = await TeacherService.getStudentDetails(studentId, actor, filters);

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

  static async getStudentSubjectPerformance(req, res) {
    try {
      const studentId = req.params.studentId;
      const filters = req.validatedQuery || req.query;
      const actor = {
        userId: req.user.userId,
        role: req.user.role,
      };
      const data = await TeacherService.getStudentSubjectPerformance(studentId, actor, filters);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch student subject performance",
      });
    }
  }

  static async getStudentPerformanceOverview(req, res) {
    try {
      const studentId = req.params.studentId;
      const filters = req.validatedQuery || req.query;
      const actor = {
        userId: req.user.userId,
        role: req.user.role,
      };
      const data = await TeacherService.getStudentPerformanceOverview(studentId, actor, filters);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch student performance overview",
      });
    }
  }

  static async getStudentLatestPredictions(req, res) {
    try {
      const studentId = req.params.studentId;
      const filters = req.validatedQuery || req.query;
      const actor = {
        userId: req.user.userId,
        role: req.user.role,
      };
      const data = await TeacherService.getStudentLatestPredictions(studentId, actor, filters);

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

  static async getStudentRecommendations(req, res) {
    try {
      const studentId = req.params.studentId;
      const filters = req.validatedQuery || req.query;
      const actor = {
        userId: req.user.userId,
        role: req.user.role,
      };
      const data = await TeacherService.getStudentRecommendations(studentId, actor, filters);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch student recommendations",
      });
    }
  }

  static async getStudentPredictionDetails(req, res) {
    try {
      const teacherId = req.user.userId;
      const { predictionId, studentId } = req.params;
      const data = await TeacherService.getStudentPredictionDetails(predictionId, studentId, teacherId);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch student prediction details",
      });
    }
  }

  static async getPredictionDetails(req, res) {
    try {
      const teacherId = req.user.userId;
      const classId = req.params.classId;
      const predictionId = req.params.predictionId;

      if (classId === "0") {
        return res.status(200).json({
          success: true,
          data: {
            class: null,
            prediction: null,
            students: [],
          },
        });
      }

      const data = await TeacherService.getPredictionDetails(classId, predictionId, teacherId);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch prediction details",
      });
    }
  }

  static async getClassDetails(req, res) {
    try {
      const teacherId = req.user.userId;
      const classId = req.params.classId;

      if (classId === "0") {
        return res.status(200).json({
          success: true,
          data: {
            class: null,
            students: [],
          },
        });
      }

      const classData = await TeacherService.getClassDetails(classId, teacherId);

      return res.status(200).json({
        success: true,
        data: classData,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch class details",
      });
    }
  }

  static async getClassPerformanceOverview(req, res) {
    try {
      const teacherId = req.user.userId;
      const classId = req.params.classId;

      if (classId === "0") {
        return res.status(200).json({
          success: true,
          data: {
            class: null,
            metrics: {
              totalStudents: 0,
              studentsAtRisk: 0,
              avgPerformance: 0,
              improvementRate: 0,
            },
            baseline: {
              latestPredictionRunId: null,
              latestPredictionAt: null,
              previousPredictionAt: null,
            },
          },
        });
      }

      const data = await TeacherService.getClassPerformanceOverview(classId, teacherId);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch class performance overview",
      });
    }
  }

  static async addStudent(req, res) {
    try {
      const teacherId = req.user.userId;
      const classId = req.params.classId;
      const student = await TeacherService.upsertStudent(classId, teacherId, req.body);

      return res.status(201).json({
        success: true,
        message: "Student data saved",
        data: { student },
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to save student",
      });
    }
  }

  static async addStudentsBulk(req, res) {
    try {
      const teacherId = req.user.userId;
      const classId = req.params.classId;
      const students = await TeacherService.bulkUpsertStudents(classId, teacherId, req.body.students);

      return res.status(201).json({
        success: true,
        message: "Student data saved",
        data: { count: students.length, students },
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to save student data",
      });
    }
  }

  static async uploadStudentsExcel(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Excel file is required",
        });
      }

      const teacherId = req.user.userId;
      const classId = req.params.classId;
      const result = await TeacherService.importStudentsFromExcel(classId, teacherId, req.file.buffer);

      return res.status(201).json({
        success: true,
        message: "Excel data imported successfully",
        data: result,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to import Excel",
      });
    }
  }

  static async getClassStudents(req, res) {
    try {
      const teacherId = req.user.userId;
      const classId = req.params.classId;

      if (classId === "0") {
        return res.status(200).json({
          success: true,
          data: { students: [] },
        });
      }

      const students = await TeacherService.getClassStudents(classId, teacherId);

      return res.status(200).json({
        success: true,
        data: { students },
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch class students",
      });
    }
  }

  static async deleteClass(req, res) {
    try {
      const teacherId = req.user.userId;
      const classId = req.params.classId;
      const result = await TeacherService.deleteClass(classId, teacherId);

      return res.status(200).json({
        success: true,
        message: "Class and all students deleted successfully",
        data: result,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to delete class",
      });
    }
  }
  static async savePrediction(req, res) {
    try {
      const teacherId = req.user.userId;
      const classId = req.params.classId;
      const result = await TeacherService.savePredictionRun(classId, teacherId, req.body);

      return res.status(201).json({
        success: true,
        message: "Prediction saved successfully",
        data: result,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to save prediction",
      });
    }
  }
}