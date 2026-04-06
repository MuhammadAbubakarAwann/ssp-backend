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
      const classId = Number(req.params.classId);
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

  static async getClassDetails(req, res) {
    try {
      const teacherId = req.user.userId;
      const classId = Number(req.params.classId);
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

  static async addStudent(req, res) {
    try {
      const teacherId = req.user.userId;
      const classId = Number(req.params.classId);
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
      const classId = Number(req.params.classId);
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
      const classId = Number(req.params.classId);
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
      const classId = Number(req.params.classId);
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
      const classId = Number(req.params.classId);
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
}
